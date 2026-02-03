import { Router } from 'express';
import { getThread, getPostsByThread, createThread, getBoard } from '../db/queries.js';
import { authenticate } from '../middleware/auth.js';
import {
  validateIdParam,
  validatePagination,
  validateBody,
  MAX_CONTENT_LENGTH,
  MAX_TITLE_LENGTH
} from '../middleware/validate.js';
import { broadcast } from '../sse.js';

const router = Router();

// GET /api/threads/:id - Get thread with posts
router.get('/:id', validateIdParam('id'), async (req, res) => {
  try {
    const thread = await getThread(req.params.id);
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    const { page, limit, offset } = validatePagination(req.query.page, req.query.limit);
    const posts = await getPostsByThread(req.params.id, limit, offset);

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
router.post('/', authenticate, validateBody(createThreadSchema), async (req, res) => {
  try {
    const { board_id, title, content } = req.body;

    const board = await getBoard(board_id);
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    const threadId = await createThread(board_id, req.agent.id, title, content);
    const thread = await getThread(threadId);

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
    console.error('Create thread error:', error);
    res.status(500).json({ error: 'Failed to create thread' });
  }
});

export default router;
