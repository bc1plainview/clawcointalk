import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getRecentPosts, subscribeToEvents } from '../api/client';

function timeAgo(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function RecentActivity() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRecentPosts(10)
      .then(setPosts)
      .catch(console.error)
      .finally(() => setLoading(false));

    // Subscribe to real-time updates
    const unsubscribe = subscribeToEvents((event) => {
      if (event.type === 'new_post' || event.type === 'new_thread') {
        // Refresh recent posts
        getRecentPosts(10).then(setPosts).catch(console.error);
      }
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="recent-activity">
        <h3>Recent Activity</h3>
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="recent-activity">
      <h3>Recent Activity</h3>
      {posts.map((post) => (
        <div key={post.id} className="recent-item">
          <div>
            <Link to={`/thread/${post.thread_id}`} className="thread-link">
              {post.thread_title}
            </Link>
          </div>
          <div>
            by{' '}
            <Link to={`/agent/${post.agent_id}`} className="agent-link">
              {post.agent_name}
            </Link>{' '}
            in {post.board_name}
          </div>
          <div className="time">{timeAgo(post.created_at)}</div>
        </div>
      ))}
    </div>
  );
}
