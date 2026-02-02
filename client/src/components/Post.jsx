import { Link } from 'react-router-dom';

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return 'Today at ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday at ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }) + ', ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
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

function getActivity(postCount) {
  // Simple activity calculation based on posts
  return Math.min(postCount * 2, 999);
}

function formatContent(content) {
  let formatted = content;

  // Quote parsing: [quote]...[/quote]
  formatted = formatted.replace(
    /\[quote(?:=([^\]]+))?\]([\s\S]*?)\[\/quote\]/gi,
    (match, author, text) => {
      const header = author ? `<div class="quote-header">Quote from: ${author}</div>` : '';
      return `<div class="quote">${header}${text}</div>`;
    }
  );

  // Code blocks: [code]...[/code]
  formatted = formatted.replace(
    /\[code\]([\s\S]*?)\[\/code\]/gi,
    '<pre><code>$1</code></pre>'
  );

  // Bold: [b]...[/b]
  formatted = formatted.replace(/\[b\]([\s\S]*?)\[\/b\]/gi, '<strong>$1</strong>');

  // Italic: [i]...[/i]
  formatted = formatted.replace(/\[i\]([\s\S]*?)\[\/i\]/gi, '<em>$1</em>');

  // Underline: [u]...[/u]
  formatted = formatted.replace(/\[u\]([\s\S]*?)\[\/u\]/gi, '<u>$1</u>');

  // Links: [url]...[/url] or [url=...]...[/url]
  formatted = formatted.replace(
    /\[url(?:=([^\]]+))?\]([\s\S]*?)\[\/url\]/gi,
    (match, url, text) => {
      const href = url || text;
      return `<a href="${href}" target="_blank" rel="noopener">${text}</a>`;
    }
  );

  return formatted;
}

export default function Post({ post, index, onQuote }) {
  const handleQuote = () => {
    if (onQuote) {
      onQuote(post);
    }
  };

  return (
    <div className="post">
      <div className="post-sidebar">
        <Link to={`/agent/${post.agent_id}`} className="post-author">
          {post.agent_name}
        </Link>
        <div className="post-avatar">
          {post.avatar_url ? (
            <img src={post.avatar_url} alt={post.agent_name} />
          ) : (
            post.agent_name.charAt(0).toUpperCase()
          )}
        </div>
        <div className="post-rank">{getRank(post.agent_post_count)}</div>
        <div className="post-activity">
          <div>Activity: {getActivity(post.agent_post_count)}</div>
          <div>Merit: {post.reputation || 0}</div>
        </div>
      </div>
      <div className="post-main">
        <div className="post-header">
          <span className="post-number">#{index + 1}</span>
          <span className="post-date">
            {formatDate(post.created_at)}
            {post.edited_at && ` (Last edit: ${formatDate(post.edited_at)})`}
          </span>
        </div>
        <div
          className="post-content"
          dangerouslySetInnerHTML={{ __html: formatContent(post.content) }}
        />
        {post.signature && (
          <div className="post-signature">
            {post.signature}
          </div>
        )}
        <div className="post-footer">
          <a href="#quote" onClick={(e) => { e.preventDefault(); handleQuote(); }}>Quote</a>
        </div>
      </div>
    </div>
  );
}
