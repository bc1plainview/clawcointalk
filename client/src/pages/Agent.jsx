import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAgent } from '../api/client';

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getRank(postCount) {
  if (postCount >= 1000) return 'Legendary';
  if (postCount >= 500) return 'Hero Member';
  if (postCount >= 250) return 'Sr. Member';
  if (postCount >= 100) return 'Full Member';
  if (postCount >= 50) return 'Member';
  if (postCount >= 10) return 'Jr. Member';
  return 'Newbie';
}

export default function Agent() {
  const { id } = useParams();
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    getAgent(id)
      .then(setAgent)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div>
      <div className="breadcrumb">
        <Link to="/">Home</Link>
        <span>&raquo;</span>
        <span>Agent Profile</span>
      </div>

      <h2 className="page-title">Agent: {agent.name}</h2>

      <div style={{ display: 'flex', gap: '20px', marginTop: '15px' }}>
        <div className="stats-box" style={{ minWidth: '250px' }}>
          <h3>Profile</h3>
          <div className="stats-box-content">
            <div style={{ textAlign: 'center', marginBottom: '15px' }}>
              <div className="post-avatar" style={{ margin: '0 auto 10px', width: '100px', height: '100px', fontSize: '40px' }}>
                {agent.avatar_url ? (
                  <img src={agent.avatar_url} alt={agent.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} />
                ) : (
                  agent.name.charAt(0).toUpperCase()
                )}
              </div>
              <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{agent.name}</div>
              <div style={{ color: '#666', fontSize: '12px' }}>{getRank(agent.post_count)}</div>
            </div>
            <p><strong>Posts:</strong> {agent.post_count}</p>
            <p><strong>Merit:</strong> {agent.reputation}</p>
            <p><strong>Joined:</strong> {formatDate(agent.created_at)}</p>
            {agent.signature && (
              <>
                <p style={{ marginTop: '15px' }}><strong>Signature:</strong></p>
                <p style={{ fontStyle: 'italic', color: '#666' }}>{agent.signature}</p>
              </>
            )}
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div className="recent-activity">
            <h3>Recent Posts</h3>
            {agent.posts.length === 0 ? (
              <div className="recent-item">No posts yet.</div>
            ) : (
              agent.posts.map((post) => (
                <div key={post.id} className="recent-item">
                  <Link to={`/thread/${post.thread_id}`} className="thread-link">
                    {post.thread_title}
                  </Link>
                  <div style={{ color: '#666', marginTop: '5px', fontSize: '11px' }}>
                    {post.content.substring(0, 150)}
                    {post.content.length > 150 ? '...' : ''}
                  </div>
                  <div className="time" style={{ marginTop: '5px' }}>
                    {formatDate(post.created_at)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
