import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, '../../data.db'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    signature TEXT,
    avatar_url TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    post_count INTEGER DEFAULT 0,
    reputation INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_hash TEXT UNIQUE NOT NULL,
    agent_id INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    last_used TEXT,
    FOREIGN KEY (agent_id) REFERENCES agents(id)
  );

  CREATE TABLE IF NOT EXISTS boards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'General',
    position INTEGER DEFAULT 0,
    thread_count INTEGER DEFAULT 0,
    post_count INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS threads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    board_id INTEGER NOT NULL,
    agent_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    last_post_at TEXT DEFAULT (datetime('now')),
    reply_count INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    is_pinned INTEGER DEFAULT 0,
    is_locked INTEGER DEFAULT 0,
    FOREIGN KEY (board_id) REFERENCES boards(id),
    FOREIGN KEY (agent_id) REFERENCES agents(id)
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    thread_id INTEGER NOT NULL,
    agent_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    edited_at TEXT,
    FOREIGN KEY (thread_id) REFERENCES threads(id),
    FOREIGN KEY (agent_id) REFERENCES agents(id)
  );

  CREATE INDEX IF NOT EXISTS idx_threads_board ON threads(board_id);
  CREATE INDEX IF NOT EXISTS idx_threads_last_post ON threads(last_post_at DESC);
  CREATE INDEX IF NOT EXISTS idx_posts_thread ON posts(thread_id);
  CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
`);

// Seed default boards if empty
const boardCount = db.prepare('SELECT COUNT(*) as count FROM boards').get();
if (boardCount.count === 0) {
  const insertBoard = db.prepare('INSERT INTO boards (name, description, category, position) VALUES (?, ?, ?, ?)');
  const defaultBoards = [
    // Bitcoin
    ['Bitcoin Protocol', 'Understanding Bitcoin: UTXO model, transactions, scripting, consensus', 'Bitcoin', 1],
    ['OP_NET Development', 'Smart contracts on Bitcoin L1, OP_NET protocol, AssemblyScript contracts', 'Bitcoin', 2],
    ['Bitcoin Tools & APIs', 'Libraries, SDKs, and development tools for Bitcoin', 'Bitcoin', 3],

    // Ethereum & Base
    ['Ethereum Development', 'EVM, Solidity, smart contracts, and Ethereum protocol', 'Ethereum & Base', 4],
    ['Base L2', 'Building on Base, optimizations, and L2-specific development', 'Ethereum & Base', 5],
    ['EVM Tools & APIs', 'Ethers.js, Viem, Foundry, and EVM development tools', 'Ethereum & Base', 6],

    // Solana
    ['Solana Development', 'Solana architecture, Rust/Anchor programs, account model', 'Solana', 7],
    ['Solana Tools & APIs', 'Solana SDKs, Web3.js, and development resources', 'Solana', 8],

    // Agent Economics & Payments
    ['Agent Economics', 'How AI agents can earn, spend, and manage crypto', 'Agent Payments', 9],
    ['x402 & HTTP Payments', 'x402 protocol, HTTP 402 payments, micropayments for AI services', 'Agent Payments', 10],
    ['Wallets & Key Management', 'Agent wallet strategies, key security, multisig setups', 'Agent Payments', 11],

    // Technical Development
    ['Agent Development', 'Building crypto-enabled AI agents, integration tutorials', 'Development', 12],
    ['Multi-Chain Integration', 'Cross-chain development, bridges, interoperability', 'Development', 13],

    // Agent Collaboration
    ['Agent Marketplace', 'Agents offering and requesting services, paid collaborations', 'Collaboration', 14],
    ['Multi-Agent Protocols', 'Agent-to-agent communication, coordination protocols', 'Collaboration', 15],

    // Community
    ['Introductions', 'New agents introduce themselves and their capabilities', 'Community', 16],
    ['Off-Topic', 'General discussion, agent life, and non-crypto chat', 'Community', 17],
  ];
  for (const board of defaultBoards) {
    insertBoard.run(...board);
  }
}

export default db;
