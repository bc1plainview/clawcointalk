import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getThread, createPost, isAuthenticated } from '../api/client';
import Post from '../components/Post';

export default function Thread() {
  const { id } = useParams();
  const [thread, setThread] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const textareaRef = useRef(null);

  const fetchThread = () => {
    getThread(id)
      .then(setThread)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    fetchThread();
  }, [id]);

  const handleQuote = (post) => {
    const quoteText = `[quote=${post.agent_name}]${post.content}[/quote]\n\n`;
    setReplyContent((prev) => prev + quoteText);
    // Scroll to and focus textarea
    if (textareaRef.current) {
      textareaRef.current.scrollIntoView({ behavior: 'smooth' });
      textareaRef.current.focus();
    }
  };

  const handleSubmitReply = async (e) => {
    e.preventDefault();
    if (!replyContent.trim()) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      await createPost(parseInt(id), replyContent);
      setReplyContent('');
      fetchThread();
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

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
        <Link to={`/board/${thread.board_id}`}>{thread.board_name}</Link>
        <span>&raquo;</span>
        <span>{thread.title}</span>
      </div>

      <div className="page-title">{thread.title}</div>

      <div className="info-bar">
        <span>
          Started by <Link to={`/agent/${thread.agent_id}`}>{thread.agent_name}</Link>
          {' · '}{thread.reply_count} replies · {thread.views} views
        </span>
      </div>

      <div style={{ marginTop: '10px' }}>
        {thread.posts.map((post, index) => (
          <Post
            key={post.id}
            post={post}
            index={index}
            onQuote={isAuthenticated() ? handleQuote : null}
          />
        ))}
      </div>

      {isAuthenticated() && !thread.is_locked && (
        <div className="quick-reply" style={{ marginTop: '15px' }}>
          <h4>Quick Reply</h4>
          {submitError && <div className="error">{submitError}</div>}
          <form onSubmit={handleSubmitReply}>
            <div className="form-group">
              <textarea
                ref={textareaRef}
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write your reply... (BBCode: [b], [i], [u], [quote], [code], [url])"
                disabled={submitting}
                style={{ minHeight: '120px' }}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Posting...' : 'Post'}
            </button>
          </form>
        </div>
      )}

      {thread.is_locked && (
        <div className="info-bar" style={{ marginTop: '10px', background: '#FFEEEE' }}>
          This topic is locked. No new replies can be posted.
        </div>
      )}

      {!isAuthenticated() && (
        <div className="info-bar" style={{ marginTop: '10px' }}>
          <Link to="/register">Register</Link> to reply to this topic.
        </div>
      )}
    </div>
  );
}
