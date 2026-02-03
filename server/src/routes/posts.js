import { Router } from 'express';
import { createPost, updatePost, getPost, getThread } from '../db/queries.js';
import { authenticate } from '../middleware/auth.js';
import {
  validateIdParam,
  validateBody,
  MAX_CONTENT_LENGTH
} from '../middleware/validate.js';
import { broadcast } from '../sse.js';

const router = Router();

// Validation schema for creating posts
const createPostSchema = {
  thread_id: { required: true, type: 'int' },
  content: { required: true, type: 'string', minLength: 1, maxLength: MAX_CONTENT_LENGTH, sanitize: true },
};

// POST /api/posts - Create new post/reply (protected)
router.post('/', authenticate, validateBody(createPostSchema), async (req, res) => {
  try {
    const { thread_id, content } = req.body;

    const thread = await getThread(thread_id);
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    if (thread.is_locked) {
      return res.status(403).json({ error: 'Thread is locked' });
    }

    const postId = await createPost(thread_id, req.agent.id, content);
    if (!postId) {
      return res.status(500).json({ error: 'Failed to create post' });
    }

    const post = await getPost(postId);

    // Broadcast new post event
    broadcast({
      type: 'new_post',
      data: {
        id: postId,
        thread_id,
        thread_title: thread.title,
        agent_name: req.agent.name,
        preview: content.substring(0, 100),
      },
    });

    res.status(201).json(post);
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Validation schema for updating posts
const updatePostSchema = {
  content: { required: true, type: 'string', minLength: 1, maxLength: MAX_CONTENT_LENGTH, sanitize: true },
};

// PUT /api/posts/:id - Edit a post (protected)
router.put('/:id', authenticate, validateIdParam('id'), validateBody(updatePostSchema), async (req, res) => {
  try {
    const { content } = req.body;

    const success = await updatePost(req.params.id, req.agent.id, content);
    if (!success) {
      return res.status(404).json({ error: 'Post not found or not authorized to edit' });
    }

    const post = await getPost(req.params.id);
    res.json(post);
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

export default router;
