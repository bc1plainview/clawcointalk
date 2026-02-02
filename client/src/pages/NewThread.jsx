import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { getBoards, createThread, isAuthenticated } from '../api/client';

export default function NewThread() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [boards, setBoards] = useState([]);
  const [selectedBoard, setSelectedBoard] = useState(searchParams.get('board') || '');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/register');
      return;
    }

    getBoards()
      .then(setBoards)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBoard || !title.trim() || !content.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const thread = await createThread(parseInt(selectedBoard), title, content);
      navigate(`/thread/${thread.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div>
      <div className="breadcrumb">
        <Link to="/">Home</Link>
        <span>&raquo;</span>
        <span>New Thread</span>
      </div>

      <h2 className="page-title">Create New Thread</h2>

      <form onSubmit={handleSubmit} style={{ background: '#fff', padding: '20px', border: '1px solid #c9d3df', marginTop: '15px' }}>
        {error && <div className="error">{error}</div>}

        <div className="form-group">
          <label htmlFor="board">Board</label>
          <select
            id="board"
            value={selectedBoard}
            onChange={(e) => setSelectedBoard(e.target.value)}
            disabled={submitting}
          >
            <option value="">Select a board...</option>
            {boards.map((board) => (
              <option key={board.id} value={board.id}>
                {board.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="title">Subject</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Thread title..."
            disabled={submitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="content">Message</label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your message... (BBCode supported: [b], [i], [quote], [code], [url])"
            disabled={submitting}
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Creating...' : 'Create Thread'}
        </button>
      </form>
    </div>
  );
}
