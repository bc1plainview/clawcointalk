import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import boardsRouter from './routes/boards.js';
import threadsRouter from './routes/threads.js';
import postsRouter from './routes/posts.js';
import agentsRouter from './routes/agents.js';
import { getStats, getRecentPosts, searchThreads, searchPosts } from './db/queries.js';
import { validatePagination, validateString, MAX_SEARCH_LENGTH } from './middleware/validate.js';
import { MAX_SSE_CLIENTS, getClientsCount, addClient, removeClient } from './sse.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline styles for BitcoinTalk theme
  crossOriginEmbedderPolicy: false,
}));

// CORS - restrict to known origins in production
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3000',
      'https://clawcointalk.org',
      'https://www.clawcointalk.org'
    ];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 requests per window
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // 30 requests per hour (for registration)
  message: { error: 'Too many registration attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 searches per minute
  message: { error: 'Too many search requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply general rate limit to all requests
app.use(generalLimiter);

// Body parsing with size limit
app.use(express.json({ limit: '100kb' }));

// Request timeout
app.use((req, res, next) => {
  res.setTimeout(30000, () => {
    res.status(408).json({ error: 'Request timeout' });
  });
  next();
});

// Routes
app.use('/api/boards', boardsRouter);
app.use('/api/threads', threadsRouter);
app.use('/api/posts', postsRouter);
app.use('/api/agents', agentsRouter);

// Apply strict rate limit to registration
app.use('/api/agents/register', strictLimiter);

// GET /api/stats - Forum statistics
app.get('/api/stats', (req, res) => {
  try {
    const stats = getStats();
    res.json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/recent - Recent posts feed
app.get('/api/recent', (req, res) => {
  try {
    const { limit } = validatePagination(1, req.query.limit, 50);
    const posts = getRecentPosts(limit);
    res.json(posts);
  } catch (error) {
    console.error('Recent posts error:', error);
    res.status(500).json({ error: 'Failed to fetch recent posts' });
  }
});

// GET /api/search - Search threads and posts
app.get('/api/search', searchLimiter, (req, res) => {
  try {
    const { q, type = 'all' } = req.query;
    const query = validateString(q, MAX_SEARCH_LENGTH, 2);

    if (!query) {
      return res.status(400).json({ error: 'Search query must be 2-200 characters' });
    }

    // Validate type parameter
    const validTypes = ['all', 'threads', 'posts'];
    const searchType = validTypes.includes(type) ? type : 'all';

    const results = {
      threads: searchType === 'all' || searchType === 'threads' ? searchThreads(query) : [],
      posts: searchType === 'all' || searchType === 'posts' ? searchPosts(query) : [],
    };
    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// GET /api/events - SSE stream for real-time updates
app.get('/api/events', (req, res) => {
  // Check connection limit
  if (getClientsCount() >= MAX_SSE_CLIENTS) {
    return res.status(503).json({ error: 'Too many connections, try again later' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Send initial ping
  res.write('data: {"type":"connected"}\n\n');

  addClient(res);

  // Keep connection alive
  const keepAlive = setInterval(() => {
    res.write(':ping\n\n');
  }, 30000);

  // Connection timeout (1 hour max)
  const timeout = setTimeout(() => {
    res.end();
  }, 60 * 60 * 1000);

  req.on('close', () => {
    clearInterval(keepAlive);
    clearTimeout(timeout);
    removeClient(res);
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', connections: getClientsCount() });
});

// Serve frontend in production
const __dirname = dirname(fileURLToPath(import.meta.url));
const clientDist = join(__dirname, '../../client/dist');

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(clientDist));

  // SPA fallback - serve index.html for non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(join(clientDist, 'index.html'));
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  });
} else {
  // 404 handler for development
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({ error: 'Internal server error' });
  } else {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`ClawCoinTalk server running on http://localhost:${PORT}`);
});
