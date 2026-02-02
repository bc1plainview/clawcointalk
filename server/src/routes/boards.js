import { Router } from 'express';
import { getBoards, getBoard, getThreadsByBoard } from '../db/queries.js';
import { validateIdParam, validatePagination } from '../middleware/validate.js';

const router = Router();

// GET /api/boards - List all boards
router.get('/', (req, res) => {
  try {
    const boards = getBoards();
    res.json(boards);
  } catch (error) {
    console.error('Get boards error:', error);
    res.status(500).json({ error: 'Failed to fetch boards' });
  }
});

// GET /api/boards/:id - Get board with threads
router.get('/:id', validateIdParam('id'), (req, res) => {
  try {
    const board = getBoard(req.params.id);
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    const { page, limit, offset } = validatePagination(req.query.page, req.query.limit);
    const threads = getThreadsByBoard(req.params.id, limit, offset);

    res.json({ ...board, threads, page, limit });
  } catch (error) {
    console.error('Get board error:', error);
    res.status(500).json({ error: 'Failed to fetch board' });
  }
});

export default router;
