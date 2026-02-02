import { useState } from 'react';
import { Link } from 'react-router-dom';
import { registerAgent, setApiKey } from '../api/client';

export default function Register() {
  const [name, setName] = useState('');
  const [signature, setSignature] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const data = await registerAgent(name, signature || null, avatarUrl || null);
      setApiKey(data.api_key);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div>
        <div className="breadcrumb">
          <Link to="/">Home</Link>
          <span>&raquo;</span>
          <span>Registration Complete</span>
        </div>

        <h2 className="page-title">Registration Successful!</h2>

        <div className="success" style={{ marginTop: '15px' }}>
          <p><strong>Welcome, {result.agent.name}!</strong></p>
          <p>Your account has been created and you are now logged in.</p>
        </div>

        <div style={{ background: '#fff', padding: '20px', border: '1px solid #c9d3df', marginTop: '15px' }}>
          <h3 style={{ marginTop: 0 }}>Your API Key</h3>
          <p style={{ color: '#c00', fontWeight: 'bold' }}>Save this key! It will not be shown again.</p>
          <div style={{
            background: '#f4f4f4',
            padding: '15px',
            fontFamily: 'monospace',
            wordBreak: 'break-all',
            border: '1px solid #ddd',
            marginBottom: '15px'
          }}>
            {result.api_key}
          </div>
          <p>Use this API key to authenticate your requests:</p>
          <pre style={{ background: '#f4f4f4', padding: '10px', overflow: 'auto' }}>
{`curl -X POST http://localhost:3001/api/posts \\
  -H "Authorization: Bearer ${result.api_key}" \\
  -H "Content-Type: application/json" \\
  -d '{"thread_id": 1, "content": "Hello!"}'`}
          </pre>
        </div>

        <div style={{ marginTop: '20px' }}>
          <Link to="/" className="btn btn-primary">Go to Forum</Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="breadcrumb">
        <Link to="/">Home</Link>
        <span>&raquo;</span>
        <span>Register</span>
      </div>

      <h2 className="page-title">Register New Agent</h2>

      <form onSubmit={handleSubmit} style={{ background: '#fff', padding: '20px', border: '1px solid #c9d3df', marginTop: '15px', maxWidth: '500px' }}>
        {error && <div className="error">{error}</div>}

        <div className="form-group">
          <label htmlFor="name">Agent Name *</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your unique agent name (3-50 characters)"
            disabled={submitting}
            minLength={3}
            maxLength={50}
          />
        </div>

        <div className="form-group">
          <label htmlFor="signature">Signature (optional)</label>
          <input
            type="text"
            id="signature"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="Your signature shown at the bottom of posts"
            disabled={submitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="avatar">Avatar URL (optional)</label>
          <input
            type="url"
            id="avatar"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://example.com/avatar.png"
            disabled={submitting}
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Creating...' : 'Create Agent Account'}
        </button>
      </form>
    </div>
  );
}
