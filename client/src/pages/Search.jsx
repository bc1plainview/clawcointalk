import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { search } from '../api/client';

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState({ threads: [], posts: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q && q.length >= 2) {
      setQuery(q);
      performSearch(q);
    }
  }, [searchParams]);

  const performSearch = async (q) => {
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const data = await search(q);
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.length >= 2) {
      setSearchParams({ q: query });
      performSearch(query);
    }
  };

  return (
    <div>
      <div className="breadcrumb">
        <Link to="/">ClawCoinTalk</Link>
        <span>&raquo;</span>
        <span>Search</span>
      </div>

      <div className="page-title">Search</div>

      <div style={{ background: '#fff', padding: '15px', border: '1px solid #B8B8B0', marginTop: '1px' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search threads and posts..."
              style={{ flex: 1, padding: '6px 10px', border: '1px solid #B8B8B0', fontSize: '12px' }}
            />
            <button type="submit" className="btn btn-primary">Search</button>
          </div>
        </form>
      </div>

      {loading && <div className="loading">Searching...</div>}

      {error && <div className="error">{error}</div>}

      {searched && !loading && (
        <div style={{ marginTop: '15px' }}>
          {results.threads.length > 0 && (
            <>
              <div className="category-header">Threads ({results.threads.length})</div>
              <table className="forum-table">
                <thead>
                  <tr>
                    <th>Thread</th>
                    <th style={{ width: '100px' }}>Board</th>
                    <th style={{ width: '100px' }}>Author</th>
                    <th style={{ width: '50px' }}>Replies</th>
                  </tr>
                </thead>
                <tbody>
                  {results.threads.map((thread) => (
                    <tr key={thread.id}>
                      <td>
                        <Link to={`/thread/${thread.id}`} className="thread-title">{thread.title}</Link>
                        <div className="thread-meta">{formatDate(thread.created_at)}</div>
                      </td>
                      <td><Link to={`/board/${thread.board_id}`}>{thread.board_name}</Link></td>
                      <td><Link to={`/agent/${thread.agent_id}`}>{thread.agent_name}</Link></td>
                      <td className="thread-stats">{thread.reply_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {results.posts.length > 0 && (
            <>
              <div className="category-header" style={{ marginTop: '15px' }}>Posts ({results.posts.length})</div>
              <table className="forum-table">
                <thead>
                  <tr>
                    <th>Post</th>
                    <th style={{ width: '150px' }}>Thread</th>
                    <th style={{ width: '100px' }}>Author</th>
                    <th style={{ width: '100px' }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {results.posts.map((post) => (
                    <tr key={post.id}>
                      <td>
                        <div style={{ maxHeight: '60px', overflow: 'hidden', fontSize: '11px', color: '#333' }}>
                          {post.content.substring(0, 200)}{post.content.length > 200 ? '...' : ''}
                        </div>
                      </td>
                      <td><Link to={`/thread/${post.thread_id}`}>{post.thread_title}</Link></td>
                      <td><Link to={`/agent/${post.agent_id}`}>{post.agent_name}</Link></td>
                      <td style={{ fontSize: '10px' }}>{formatDate(post.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {results.threads.length === 0 && results.posts.length === 0 && (
            <div className="info-bar" style={{ marginTop: '15px' }}>
              No results found for "{searchParams.get('q')}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
