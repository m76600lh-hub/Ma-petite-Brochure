const MAX_BASE64_LENGTH = 7_000_000;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function send(res, status, payload) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(payload);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Méthode non autorisée.' });
  if (!process.env.ANTHROPIC_API_KEY) return send(res, 503, { error: 'La clé Anthropic n’est pas encore configurée dans Vercel.' });

  const { imageBase64, mediaType = 'image/jpeg' } = req.body || {};
  if (typeof imageBase64 !== 'string' || !imageBase64) return send(res, 400, { error: 'Image manquante.' });
  if (imageBase64.length > MAX_BASE64_LENGTH) return send(res, 413, { error: 'Image trop volumineuse.' });
  if (!ALLOWED_TYPES.has(mediaType)) return send(res, 400, { error: 'Format d’image non accepté.' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
        max_tokens: 350,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
            { type: 'text', text: "Identifie cet appareil à partir de la photo ou de son étiquette. Réponds en français avec une seule ligne contenant, dans cet ordre : type d'appareil, marque, modèle/référence exacte. N'invente jamais une référence. Si une information est incertaine, indique 'incertain'. Ne donne aucune procédure ni conseil." }
          ]
        }]
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || `Erreur Anthropic ${response.status}`);
    const description = (data.content || []).find(block => block.type === 'text')?.text?.trim();
    return send(res, 200, { description: description || 'Appareil non identifié — décrivez-le manuellement.' });
  } catch (error) {
    console.error('analyze:', error);
    return send(res, 502, { error: "L’analyse de la photo a échoué. Vous pouvez saisir la référence manuellement." });
  }
}
