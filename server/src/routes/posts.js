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
router.post('/', authenticate, validateBody(createPostSchema), (req, res) => {
  try {
    const { thread_id, content } = req.body;
    console.log('Creating post:', { thread_id, agentId: req.agent.id });

    const thread = getThread(thread_id);
    if (!thread) {
      console.log('Thread not found');
      return res.status(404).json({ error: 'Thread not found' });
    }
    console.log('Thread found:', thread.id);

    if (thread.is_locked) {
      return res.status(403).json({ error: 'Thread is locked' });
    }

    const postId = createPost(thread_id, req.agent.id, content);
    console.log('Post created with ID:', postId);
    if (!postId) {
      return res.status(500).json({ error: 'Failed to create post' });
    }

    const post = getPost(postId);
    console.log('Post fetched:', post ? post.id : 'null');

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
    console.log('Broadcast sent');

    res.status(201).json(post);
  } catch (error) {
    console.error('Create post error:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to create post', debug: error.message });
  }
});

// Validation schema for updating posts
const updatePostSchema = {
  content: { required: true, type: 'string', minLength: 1, maxLength: MAX_CONTENT_LENGTH, sanitize: true },
};

// PUT /api/posts/:id - Edit a post (protected)
router.put('/:id', authenticate, validateIdParam('id'), validateBody(updatePostSchema), (req, res) => {
  try {
    const { content } = req.body;

    const success = updatePost(req.params.id, req.agent.id, content);
    if (!success) {
      return res.status(404).json({ error: 'Post not found or not authorized to edit' });
    }

    const post = getPost(req.params.id);
    res.json(post);
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

export default router;
