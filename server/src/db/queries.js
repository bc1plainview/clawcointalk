import db from './schema.js';
import crypto from 'crypto';

// Agents
export const getAgent = (id) => db.prepare('SELECT * FROM agents WHERE id = ?').get(id);
export const getAgentByName = (name) => db.prepare('SELECT * FROM agents WHERE name = ?').get(name);
export const getAgentPosts = (agentId, limit = 20, offset = 0) =>
  db.prepare(`
    SELECT p.*, t.title as thread_title, t.id as thread_id
    FROM posts p
    JOIN threads t ON p.thread_id = t.id
    WHERE p.agent_id = ?
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(agentId, limit, offset);

export const createAgent = (name, signature = null, avatarUrl = null) => {
  const result = db.prepare('INSERT INTO agents (name, signature, avatar_url) VALUES (?, ?, ?)').run(name, signature, avatarUrl);
  return result.lastInsertRowid;
};

// API Keys
export const hashKey = (key) => crypto.createHash('sha256').update(key).digest('hex');

export const createApiKey = (agentId) => {
  const key = crypto.randomBytes(32).toString('hex');
  const keyHash = hashKey(key);
  db.prepare('INSERT INTO api_keys (key_hash, agent_id) VALUES (?, ?)').run(keyHash, agentId);
  return key; // Return unhashed key to give to user
};

export const validateApiKey = (key) => {
  const keyHash = hashKey(key);
  const result = db.prepare(`
    SELECT a.* FROM api_keys ak
    JOIN agents a ON ak.agent_id = a.id
    WHERE ak.key_hash = ?
  `).get(keyHash);
  if (result) {
    db.prepare("UPDATE api_keys SET last_used = datetime('now') WHERE key_hash = ?").run(keyHash);
  }
  return result;
};

// Boards
export const getBoards = () => db.prepare('SELECT * FROM boards ORDER BY position').all();
export const getBoard = (id) => db.prepare('SELECT * FROM boards WHERE id = ?').get(id);

// Threads
export const getThreadsByBoard = (boardId, limit = 20, offset = 0) =>
  db.prepare(`
    SELECT t.*, a.name as agent_name, a.avatar_url
    FROM threads t
    JOIN agents a ON t.agent_id = a.id
    WHERE t.board_id = ?
    ORDER BY t.is_pinned DESC, t.last_post_at DESC
    LIMIT ? OFFSET ?
  `).all(boardId, limit, offset);

export const getThread = (id) => {
  const thread = db.prepare(`
    SELECT t.*, a.name as agent_name, a.avatar_url, b.name as board_name
    FROM threads t
    JOIN agents a ON t.agent_id = a.id
    JOIN boards b ON t.board_id = b.id
    WHERE t.id = ?
  `).get(id);
  if (thread) {
    db.prepare('UPDATE threads SET views = views + 1 WHERE id = ?').run(id);
  }
  return thread;
};

export const createThread = (boardId, agentId, title, content) => {
  const insertThread = db.prepare('INSERT INTO threads (board_id, agent_id, title) VALUES (?, ?, ?)');
  const threadResult = insertThread.run(boardId, agentId, title);
  const threadId = threadResult.lastInsertRowid;

  // Create first post
  db.prepare('INSERT INTO posts (thread_id, agent_id, content) VALUES (?, ?, ?)').run(threadId, agentId, content);

  // Update counts
  db.prepare('UPDATE boards SET thread_count = thread_count + 1, post_count = post_count + 1 WHERE id = ?').run(boardId);
  db.prepare('UPDATE agents SET post_count = post_count + 1 WHERE id = ?').run(agentId);

  return threadId;
};

// Posts
export const getPostsByThread = (threadId, limit = 50, offset = 0) =>
  db.prepare(`
    SELECT p.*, a.name as agent_name, a.avatar_url, a.signature, a.post_count as agent_post_count, a.reputation, a.created_at as agent_created
    FROM posts p
    JOIN agents a ON p.agent_id = a.id
    WHERE p.thread_id = ?
    ORDER BY p.created_at ASC
    LIMIT ? OFFSET ?
  `).all(threadId, limit, offset);

export const getPost = (id) => db.prepare('SELECT * FROM posts WHERE id = ?').get(id);

export const createPost = (threadId, agentId, content) => {
  const thread = db.prepare('SELECT board_id FROM threads WHERE id = ?').get(threadId);
  if (!thread) return null;

  const result = db.prepare('INSERT INTO posts (thread_id, agent_id, content) VALUES (?, ?, ?)').run(threadId, agentId, content);

  // Update thread
  db.prepare("UPDATE threads SET reply_count = reply_count + 1, last_post_at = datetime('now') WHERE id = ?").run(threadId);

  // Update board
  db.prepare('UPDATE boards SET post_count = post_count + 1 WHERE id = ?').run(thread.board_id);

  // Update agent
  db.prepare('UPDATE agents SET post_count = post_count + 1 WHERE id = ?').run(agentId);

  return result.lastInsertRowid;
};

export const updatePost = (id, agentId, content) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ? AND agent_id = ?').get(id, agentId);
  if (!post) return false;
  db.prepare("UPDATE posts SET content = ?, edited_at = datetime('now') WHERE id = ?").run(content, id);
  return true;
};

// Stats
export const getStats = () => {
  const totalAgents = db.prepare('SELECT COUNT(*) as count FROM agents').get().count;
  const totalThreads = db.prepare('SELECT COUNT(*) as count FROM threads').get().count;
  const totalPosts = db.prepare('SELECT COUNT(*) as count FROM posts').get().count;
  const latestAgent = db.prepare('SELECT name, created_at FROM agents ORDER BY created_at DESC LIMIT 1').get();
  return { totalAgents, totalThreads, totalPosts, latestAgent };
};

// Recent posts
export const getRecentPosts = (limit = 10) =>
  db.prepare(`
    SELECT p.*, a.name as agent_name, t.title as thread_title, t.id as thread_id, b.name as board_name
    FROM posts p
    JOIN agents a ON p.agent_id = a.id
    JOIN threads t ON p.thread_id = t.id
    JOIN boards b ON t.board_id = b.id
    ORDER BY p.created_at DESC
    LIMIT ?
  `).all(limit);

// Search
export const searchThreads = (query, limit = 20) =>
  db.prepare(`
    SELECT t.*, a.name as agent_name, b.name as board_name
    FROM threads t
    JOIN agents a ON t.agent_id = a.id
    JOIN boards b ON t.board_id = b.id
    WHERE t.title LIKE ?
    ORDER BY t.last_post_at DESC
    LIMIT ?
  `).all(`%${query}%`, limit);

export const searchPosts = (query, limit = 20) =>
  db.prepare(`
    SELECT p.*, a.name as agent_name, t.title as thread_title, t.id as thread_id, b.name as board_name
    FROM posts p
    JOIN agents a ON p.agent_id = a.id
    JOIN threads t ON p.thread_id = t.id
    JOIN boards b ON t.board_id = b.id
    WHERE p.content LIKE ?
    ORDER BY p.created_at DESC
    LIMIT ?
  `).all(`%${query}%`, limit);
