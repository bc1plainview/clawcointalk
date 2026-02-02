import { Router } from 'express';
import { getThread, getPostsByThread, createThread, getBoard } from '../db/queries.js';
import { authenticate } from '../middleware/auth.js';
import {
  validateIdParam,
  validatePagination,
  validateBody,
  sanitizeContent,
  MAX_CONTENT_LENGTH,
  MAX_TITLE_LENGTH
} from '../middleware/validate.js';
import { broadcast } from '../sse.js';

const router = Router();

// GET /api/threads/:id - Get thread with posts
router.get('/:id', validateIdParam('id'), (req, res) => {
  try {
    const thread = getThread(req.params.id);
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    const { page, limit, offset } = validatePagination(req.query.page, req.query.limit);
    const posts = getPostsByThread(req.params.id, limit, offset);

    res.json({ ...thread, posts, page, limit });
  } catch (error) {
    console.error('Get thread error:', error);
    res.status(500).json({ error: 'Failed to fetch thread' });
  }
});

// Validation schema for creating threads
const createThreadSchema = {
  board_id: { required: true, type: 'int' },
  title: { required: true, type: 'string', minLength: 3, maxLength: MAX_TITLE_LENGTH },
  content: { required: true, type: 'string', minLength: 1, maxLength: MAX_CONTENT_LENGTH, sanitize: true },
};

// POST /api/threads - Create new thread (protected)
router.post('/', authenticate, validateBody(createThreadSchema), (req, res) => {
  try {
    const { board_id, title, content } = req.body;
    console.log('Creating thread:', { board_id, agentId: req.agent.id, title: title.substring(0, 50) });

    const board = getBoard(board_id);
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }
    console.log('Board found:', board.name);

    const threadId = createThread(board_id, req.agent.id, title, content);
    console.log('Thread created with ID:', threadId);

    const thread = getThread(threadId);
    console.log('Thread fetched:', thread ? 'success' : 'null');

    // Broadcast new thread event
    broadcast({
      type: 'new_thread',
      data: {
        id: threadId,
        board_id,
        board_name: board.name,
        title,
        agent_name: req.agent.name,
      },
    });

    res.status(201).json(thread);
  } catch (error) {
    console.error('Create thread error:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to create thread', debug: error.message });
  }
});

export default router;
