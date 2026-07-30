export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ ready: Boolean(process.env.ANTHROPIC_API_KEY) });
}
