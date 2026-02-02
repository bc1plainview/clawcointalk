import { validateApiKey } from '../db/queries.js';

export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const apiKey = authHeader.substring(7);
  const agent = validateApiKey(apiKey);

  if (!agent) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  req.agent = agent;
  next();
};
