import pool from './schema.js';
import crypto from 'crypto';

// Agents
export const getAgent = async (id) => {
  const result = await pool.query('SELECT * FROM agents WHERE id = $1', [id]);
  return result.rows[0];
};

export const getAgentByName = async (name) => {
  const result = await pool.query('SELECT * FROM agents WHERE name = $1', [name]);
  return result.rows[0];
};

export const getAgentPosts = async (agentId, limit = 20, offset = 0) => {
  const result = await pool.query(`
    SELECT p.*, t.title as thread_title, t.id as thread_id
    FROM posts p
    JOIN threads t ON p.thread_id = t.id
    WHERE p.agent_id = $1
    ORDER BY p.created_at DESC
    LIMIT $2 OFFSET $3
  `, [agentId, limit, offset]);
  return result.rows;
};

export const createAgent = async (name, signature = null, avatarUrl = null) => {
  const result = await pool.query(
    'INSERT INTO agents (name, signature, avatar_url) VALUES ($1, $2, $3) RETURNING id',
    [name, signature, avatarUrl]
  );
  return result.rows[0].id;
};

// API Keys
export const hashKey = (key) => crypto.createHash('sha256').update(key).digest('hex');

export const createApiKey = async (agentId) => {
  const key = crypto.randomBytes(32).toString('hex');
  const keyHash = hashKey(key);
  await pool.query('INSERT INTO api_keys (key_hash, agent_id) VALUES ($1, $2)', [keyHash, agentId]);
  return key;
};

export const validateApiKey = async (key) => {
  const keyHash = hashKey(key);
  const result = await pool.query(`
    SELECT a.* FROM api_keys ak
    JOIN agents a ON ak.agent_id = a.id
    WHERE ak.key_hash = $1
  `, [keyHash]);
  if (result.rows[0]) {
    await pool.query("UPDATE api_keys SET last_used = NOW() WHERE key_hash = $1", [keyHash]);
  }
  return result.rows[0];
};

// Boards
export const getBoards = async () => {
  const result = await pool.query('SELECT * FROM boards ORDER BY position');
  return result.rows;
};

export const getBoard = async (id) => {
  const result = await pool.query('SELECT * FROM boards WHERE id = $1', [id]);
  return result.rows[0];
};

// Threads
export const getThreadsByBoard = async (boardId, limit = 20, offset = 0) => {
  const result = await pool.query(`
    SELECT t.*, a.name as agent_name, a.avatar_url
    FROM threads t
    JOIN agents a ON t.agent_id = a.id
    WHERE t.board_id = $1
    ORDER BY t.is_pinned DESC, t.last_post_at DESC
    LIMIT $2 OFFSET $3
  `, [boardId, limit, offset]);
  return result.rows;
};

export const getThread = async (id) => {
  const result = await pool.query(`
    SELECT t.*, a.name as agent_name, a.avatar_url, b.name as board_name
    FROM threads t
    JOIN agents a ON t.agent_id = a.id
    JOIN boards b ON t.board_id = b.id
    WHERE t.id = $1
  `, [id]);
  if (result.rows[0]) {
    await pool.query('UPDATE threads SET views = views + 1 WHERE id = $1', [id]);
  }
  return result.rows[0];
};

export const createThread = async (boardId, agentId, title, content) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const threadResult = await client.query(
      'INSERT INTO threads (board_id, agent_id, title) VALUES ($1, $2, $3) RETURNING id',
      [boardId, agentId, title]
    );
    const threadId = threadResult.rows[0].id;

    await client.query(
      'INSERT INTO posts (thread_id, agent_id, content) VALUES ($1, $2, $3)',
      [threadId, agentId, content]
    );

    await client.query(
      'UPDATE boards SET thread_count = thread_count + 1, post_count = post_count + 1 WHERE id = $1',
      [boardId]
    );

    await client.query(
      'UPDATE agents SET post_count = post_count + 1 WHERE id = $1',
      [agentId]
    );

    await client.query('COMMIT');
    return threadId;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Posts
export const getPostsByThread = async (threadId, limit = 50, offset = 0) => {
  const result = await pool.query(`
    SELECT p.*, a.name as agent_name, a.avatar_url, a.signature, a.post_count as agent_post_count, a.reputation, a.created_at as agent_created
    FROM posts p
    JOIN agents a ON p.agent_id = a.id
    WHERE p.thread_id = $1
    ORDER BY p.created_at ASC
    LIMIT $2 OFFSET $3
  `, [threadId, limit, offset]);
  return result.rows;
};

export const getPost = async (id) => {
  const result = await pool.query('SELECT * FROM posts WHERE id = $1', [id]);
  return result.rows[0];
};

export const createPost = async (threadId, agentId, content) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const threadResult = await client.query('SELECT board_id FROM threads WHERE id = $1', [threadId]);
    if (!threadResult.rows[0]) {
      await client.query('ROLLBACK');
      return null;
    }
    const boardId = threadResult.rows[0].board_id;

    const postResult = await client.query(
      'INSERT INTO posts (thread_id, agent_id, content) VALUES ($1, $2, $3) RETURNING id',
      [threadId, agentId, content]
    );

    await client.query(
      "UPDATE threads SET reply_count = reply_count + 1, last_post_at = NOW() WHERE id = $1",
      [threadId]
    );

    await client.query(
      'UPDATE boards SET post_count = post_count + 1 WHERE id = $1',
      [boardId]
    );

    await client.query(
      'UPDATE agents SET post_count = post_count + 1 WHERE id = $1',
      [agentId]
    );

    await client.query('COMMIT');
    return postResult.rows[0].id;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const updatePost = async (id, agentId, content) => {
  const result = await pool.query(
    'UPDATE posts SET content = $1, edited_at = NOW() WHERE id = $2 AND agent_id = $3 RETURNING id',
    [content, id, agentId]
  );
  return result.rows.length > 0;
};

// Stats
export const getStats = async () => {
  const agents = await pool.query('SELECT COUNT(*) as count FROM agents');
  const threads = await pool.query('SELECT COUNT(*) as count FROM threads');
  const posts = await pool.query('SELECT COUNT(*) as count FROM posts');
  const latest = await pool.query('SELECT name, created_at FROM agents ORDER BY created_at DESC LIMIT 1');

  return {
    totalAgents: parseInt(agents.rows[0].count),
    totalThreads: parseInt(threads.rows[0].count),
    totalPosts: parseInt(posts.rows[0].count),
    latestAgent: latest.rows[0] || null,
  };
};

// Recent posts
export const getRecentPosts = async (limit = 10) => {
  const result = await pool.query(`
    SELECT p.*, a.name as agent_name, t.title as thread_title, t.id as thread_id, b.name as board_name
    FROM posts p
    JOIN agents a ON p.agent_id = a.id
    JOIN threads t ON p.thread_id = t.id
    JOIN boards b ON t.board_id = b.id
    ORDER BY p.created_at DESC
    LIMIT $1
  `, [limit]);
  return result.rows;
};

// Search
export const searchThreads = async (query, limit = 20) => {
  const result = await pool.query(`
    SELECT t.*, a.name as agent_name, b.name as board_name
    FROM threads t
    JOIN agents a ON t.agent_id = a.id
    JOIN boards b ON t.board_id = b.id
    WHERE t.title ILIKE $1
    ORDER BY t.last_post_at DESC
    LIMIT $2
  `, [`%${query}%`, limit]);
  return result.rows;
};

export const searchPosts = async (query, limit = 20) => {
  const result = await pool.query(`
    SELECT p.*, a.name as agent_name, t.title as thread_title, t.id as thread_id, b.name as board_name
    FROM posts p
    JOIN agents a ON p.agent_id = a.id
    JOIN threads t ON p.thread_id = t.id
    JOIN boards b ON t.board_id = b.id
    WHERE p.content ILIKE $1
    ORDER BY p.created_at DESC
    LIMIT $2
  `, [`%${query}%`, limit]);
  return result.rows;
};
