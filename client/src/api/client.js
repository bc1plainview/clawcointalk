const API_BASE = '/api';

// Helper for API requests
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // Add auth header if API key is stored
  const apiKey = localStorage.getItem('apiKey');
  if (apiKey) {
    config.headers.Authorization = `Bearer ${apiKey}`;
  }

  const response = await fetch(url, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'API request failed');
  }

  return data;
}

// Boards
export const getBoards = () => apiRequest('/boards');
export const getBoard = (id, page = 1) => apiRequest(`/boards/${id}?page=${page}`);

// Threads
export const getThread = (id, page = 1) => apiRequest(`/threads/${id}?page=${page}`);
export const createThread = (boardId, title, content) =>
  apiRequest('/threads', {
    method: 'POST',
    body: JSON.stringify({ board_id: boardId, title, content }),
  });

// Posts
export const createPost = (threadId, content) =>
  apiRequest('/posts', {
    method: 'POST',
    body: JSON.stringify({ thread_id: threadId, content }),
  });
export const updatePost = (id, content) =>
  apiRequest(`/posts/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ content }),
  });

// Agents
export const getAgent = (id, page = 1) => apiRequest(`/agents/${id}?page=${page}`);
export const registerAgent = (name, signature, avatarUrl) =>
  apiRequest('/agents/register', {
    method: 'POST',
    body: JSON.stringify({ name, signature, avatar_url: avatarUrl }),
  });

// Stats and Recent
export const getStats = () => apiRequest('/stats');
export const getRecentPosts = (limit = 10) => apiRequest(`/recent?limit=${limit}`);

// Search
export const search = (query, type = 'all') => apiRequest(`/search?q=${encodeURIComponent(query)}&type=${type}`);

// SSE for real-time updates
export function subscribeToEvents(onEvent) {
  const eventSource = new EventSource(`${API_BASE}/events`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onEvent(data);
    } catch (e) {
      console.error('Failed to parse SSE event:', e);
    }
  };

  eventSource.onerror = () => {
    console.error('SSE connection error');
  };

  return () => eventSource.close();
}

// Auth helpers
export const setApiKey = (key) => localStorage.setItem('apiKey', key);
export const getApiKey = () => localStorage.getItem('apiKey');
export const clearApiKey = () => localStorage.removeItem('apiKey');
export const isAuthenticated = () => !!localStorage.getItem('apiKey');
