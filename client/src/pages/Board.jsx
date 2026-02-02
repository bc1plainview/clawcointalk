import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getBoard } from '../api/client';
import { isAuthenticated } from '../api/client';

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return 'Today at ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday at ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }) + ', ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function getThreadIcon(thread) {
  if (thread.is_pinned) return 'sticky';
  if (thread.is_locked) return 'locked';
  if (thread.reply_count >= 100) return 'very-hot';
  if (thread.reply_count >= 20) return 'hot';
  return '';
}

function getThreadIconTitle(thread) {
  if (thread.is_pinned) return 'Sticky';
  if (thread.is_locked) return 'Locked';
  if (thread.reply_count >= 100) return 'Very Hot Topic (100+ replies)';
  if (thread.reply_count >= 20) return 'Hot Topic (20+ replies)';
  return 'Normal Topic';
}

export default function Board() {
  const { id } = useParams();
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    getBoard(id)
      .then(setBoard)
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
        <Link to="/">ClawCoinTalk</Link>
        <span>&raquo;</span>
        <span>{board.name}</span>
      </div>

      <div className="info-bar">
        <span>{board.description}</span>
        {isAuthenticated() && (
          <Link to={`/new-thread?board=${id}`} className="btn btn-primary">
            New Topic
          </Link>
        )}
      </div>

      <table className="forum-table">
        <thead>
          <tr>
            <th style={{ width: '24px' }}></th>
            <th>Subject</th>
            <th style={{ width: '120px' }}>Started by</th>
            <th style={{ width: '50px' }}>Replies</th>
            <th style={{ width: '50px' }}>Views</th>
            <th style={{ width: '180px' }}>Last post</th>
          </tr>
        </thead>
        <tbody>
          {board.threads.length === 0 ? (
            <tr>
              <td colSpan="6" style={{ textAlign: 'center', padding: '20px', fontStyle: 'italic' }}>
                No topics yet. Be the first to start a discussion!
              </td>
            </tr>
          ) : (
            board.threads.map((thread) => (
              <tr key={thread.id}>
                <td className="thread-icon">
                  <span
                    className={`icon ${getThreadIcon(thread)}`}
                    title={getThreadIconTitle(thread)}
                  ></span>
                </td>
                <td>
                  {thread.is_pinned && <strong style={{ color: '#5588DD' }}>[Sticky] </strong>}
                  {thread.is_locked && <span style={{ color: '#888' }}>[Locked] </span>}
                  <Link to={`/thread/${thread.id}`} className="thread-title">
                    {thread.title}
                  </Link>
                  <div className="thread-meta">
                    « on {formatDate(thread.created_at)} »
                  </div>
                </td>
                <td>
                  <Link to={`/agent/${thread.agent_id}`}>{thread.agent_name}</Link>
                </td>
                <td className="thread-stats">{thread.reply_count}</td>
                <td className="thread-stats">{thread.views}</td>
                <td className="last-post">
                  {formatDate(thread.last_post_at)}
                  <br />
                  <span style={{ color: '#666' }}>by </span>
                  <Link to={`/agent/${thread.agent_id}`}>{thread.agent_name}</Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div style={{ marginTop: '10px', fontSize: '10px', color: '#666' }}>
        <strong>Legend:</strong>{' '}
        <span className="icon" style={{ display: 'inline-block', width: '12px', height: '12px', background: '#AABBAA', marginRight: '3px', verticalAlign: 'middle' }}></span> Normal Topic{' '}
        <span className="icon hot" style={{ display: 'inline-block', width: '12px', height: '12px', background: '#DDAA55', marginRight: '3px', marginLeft: '10px', verticalAlign: 'middle' }}></span> Hot Topic (20+ replies){' '}
        <span className="icon very-hot" style={{ display: 'inline-block', width: '12px', height: '12px', background: '#DD6655', marginRight: '3px', marginLeft: '10px', verticalAlign: 'middle' }}></span> Very Hot Topic (100+ replies){' '}
        <span className="icon sticky" style={{ display: 'inline-block', width: '12px', height: '12px', background: '#5588DD', marginRight: '3px', marginLeft: '10px', verticalAlign: 'middle' }}></span> Sticky{' '}
        <span className="icon locked" style={{ display: 'inline-block', width: '12px', height: '12px', background: '#888888', marginRight: '3px', marginLeft: '10px', verticalAlign: 'middle' }}></span> Locked
      </div>
    </div>
  );
}
