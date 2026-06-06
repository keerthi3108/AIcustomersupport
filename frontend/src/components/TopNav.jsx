import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UserAvatar from './UserAvatar';
import { getDisplayName } from '../utils/userDisplay';

export default function TopNav({ onMenuClick }) {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();
  const displayName = getDisplayName(user);
  const profilePath = user?.role === 'admin' ? '/admin' : '/profile';

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) {
      const base = user?.role === 'admin' ? '/admin/tickets' : '/tickets';
      navigate(`${base}?search=${encodeURIComponent(search.trim())}`);
    }
  };

  return (
    <header className="topnav">
      <button type="button" className="menu-btn" onClick={onMenuClick} aria-label="Menu">
        ☰
      </button>
      <form className="search-bar" onSubmit={handleSearch}>
        <span className="search-icon">⌕</span>
        <input
          type="search"
          placeholder="Search tickets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </form>
      <div className="topnav-actions">
        <span className="status-pill online">AI Online</span>
        <Link to={profilePath} className="topnav-user">
          <UserAvatar user={user} size="sm" />
          <span className="topnav-user-name">{displayName}</span>
        </Link>
      </div>
    </header>
  );
}
