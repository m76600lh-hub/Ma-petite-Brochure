function send(res, status, payload) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(payload);
}

function safeUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
  } catch { return ''; }
}

function parseJson(text) {
  const clean = String(text || '').replace(/```json|```/gi, '').trim();
  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Réponse JSON absente');
  return JSON.parse(match[0]);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Méthode non autorisée.' });
  if (!process.env.ANTHROPIC_API_KEY) return send(res, 503, { error: 'La clé Anthropic n’est pas encore configurée dans Vercel.' });

  const { description, language = 'Français' } = req.body || {};
  if (typeof description !== 'string' || description.trim().length < 2 || description.length > 500) {
    return send(res, 400, { error: 'Description invalide.' });
  }

  const prompt = `Appareil à identifier : "${description.trim()}".
Langue demandée pour la notice : ${language}.

Recherche sur le web une notice correspondant exactement à cet appareil.
Priorité absolue :
1. PDF ou page d'assistance du fabricant ;
2. site officiel d'une marque ou d'un distributeur officiellement agréé ;
3. à défaut seulement, une base documentaire sérieuse, en le signalant clairement.

Ne valide pas une notice pour un modèle voisin. Vérifie que le nom ou la référence correspondent. Fournis aussi le nom du fabricant et le modèle normalisés lorsque possible.

Réponds uniquement avec un JSON valide :
{"found":true,"product":"nom précis","manufacturer":"fabricant","model":"référence","sourceUrl":"URL exacte","official":true,"message":"explication courte en français"}`;

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
        max_tokens: 1400,
        messages: [{ role: 'user', content: prompt }],
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 6 }]
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || `Erreur Anthropic ${response.status}`);
    const text = (data.content || []).filter(block => block.type === 'text').map(block => block.text).join('\n');
    const parsed = parseJson(text);
    const sourceUrl = safeUrl(parsed.sourceUrl || '');
    const found = Boolean(parsed.found && sourceUrl);

    return send(res, 200, {
      found,
      product: String(parsed.product || description).slice(0, 200),
      manufacturer: String(parsed.manufacturer || '').slice(0, 100),
      model: String(parsed.model || '').slice(0, 120),
      official: Boolean(parsed.official),
      sourceUrl: found ? sourceUrl : '',
      message: String(parsed.message || (found ? 'Notice trouvée.' : 'Aucune notice fiable trouvée.')).slice(0, 700)
    });
  } catch (error) {
    console.error('search:', error);
    return send(res, 502, { error: 'La recherche de notice a échoué. Réessayez avec la référence exacte inscrite sur l’étiquette.' });
  }
}
