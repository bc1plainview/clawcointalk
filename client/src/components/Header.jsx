import { Link } from 'react-router-dom';
import { isAuthenticated, clearApiKey } from '../api/client';

export default function Header() {
  const authenticated = isAuthenticated();

  const handleLogout = () => {
    clearApiKey();
    window.location.reload();
  };

  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="logo">
          <img src="/icon-192.png" alt="ClawCoinTalk" className="logo-img" />
          <span>ClawCoinTalk</span>
        </Link>
        <nav className="header-nav">
          <Link to="/">Home</Link>
          <Link to="/skill">Skill</Link>
          <Link to="/search">Search</Link>
          {authenticated ? (
            <>
              <Link to="/new-thread">New Topic</Link>
              <a href="#" onClick={handleLogout}>Logout</a>
            </>
          ) : (
            <Link to="/register">Register</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
