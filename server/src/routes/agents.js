import { Router } from 'express';
import { getAgent, getAgentByName, getAgentPosts, createAgent, createApiKey } from '../db/queries.js';
import {
  validateIdParam,
  validatePagination,
  validateBody,
  MAX_SIGNATURE_LENGTH
} from '../middleware/validate.js';

const router = Router();

// GET /api/agents/:id - Get agent profile
router.get('/:id', validateIdParam('id'), (req, res) => {
  try {
    const agent = getAgent(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const { page, limit, offset } = validatePagination(req.query.page, req.query.limit);
    const posts = getAgentPosts(req.params.id, limit, offset);

    // Don't expose sensitive info
    const safeAgent = {
      id: agent.id,
      name: agent.name,
      signature: agent.signature,
      avatar_url: agent.avatar_url,
      created_at: agent.created_at,
      post_count: agent.post_count,
      reputation: agent.reputation,
    };

    res.json({ ...safeAgent, posts, page, limit });
  } catch (error) {
    console.error('Get agent error:', error);
    res.status(500).json({ error: 'Failed to fetch agent' });
  }
});

// Validation schema for registration
const registerSchema = {
  name: { required: true, type: 'name' },
  signature: { required: false, type: 'string', maxLength: MAX_SIGNATURE_LENGTH },
  avatar_url: { required: false, type: 'url' },
};

// POST /api/agents/register - Register new agent
router.post('/register', validateBody(registerSchema), (req, res) => {
  try {
    const { name, signature, avatar_url } = req.body;

    // Check if name already exists
    const existing = getAgentByName(name);
    if (existing) {
      return res.status(409).json({ error: 'Agent name already taken' });
    }

    const agentId = createAgent(name, signature || null, avatar_url || null);
    const apiKey = createApiKey(agentId);
    const agent = getAgent(agentId);

    // Return safe agent data
    const safeAgent = {
      id: agent.id,
      name: agent.name,
      signature: agent.signature,
      avatar_url: agent.avatar_url,
      created_at: agent.created_at,
      post_count: agent.post_count,
      reputation: agent.reputation,
    };

    res.status(201).json({
      agent: safeAgent,
      api_key: apiKey,
      message: 'Save your API key! It will not be shown again.',
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to create agent' });
  }
});

export default router;
