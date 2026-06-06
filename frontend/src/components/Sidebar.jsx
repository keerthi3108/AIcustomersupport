import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UserAvatar from './UserAvatar';
import { getDisplayName } from '../utils/userDisplay';

const userLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: '◉' },
  { to: '/tickets/new', label: 'Create Ticket', icon: '✚' },
  { to: '/tickets', label: 'My Tickets', icon: '☰' },
  { to: '/profile', label: 'Profile', icon: '◎' },
];

const adminLinks = [
  { to: '/admin', label: 'Dashboard', icon: '◉' },
  { to: '/admin/tickets', label: 'Tickets', icon: '☰' },
  { to: '/admin/knowledge', label: 'Knowledge Base', icon: '📚' },
  { to: '/admin/analytics', label: 'Analytics', icon: '📊' },
];

export default function Sidebar({ admin, open, onClose }) {
  const { user, logout } = useAuth();
  const links = admin ? adminLinks : userLinks;
  const displayName = getDisplayName(user);

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="sidebar-brand">
        <span className="brand-icon">AI</span>
        <div>
          <strong>SupportAI</strong>
          <small>{admin ? 'Admin Console' : 'Customer Portal'}</small>
        </div>
      </div>
      <nav className="sidebar-nav">
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} onClick={onClose} className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="nav-icon">{l.icon}</span>
            {l.label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="user-chip">
          <UserAvatar user={user} size="sm" />
          <div className="user-chip-text">
            <strong title={user?.email}>{displayName}</strong>
            <small className="capitalize">{user?.role}</small>
          </div>
        </div>
        <button type="button" className="btn btn-ghost btn-sm sidebar-signout" onClick={logout}>
          Sign out
        </button>
      </div>
    </aside>
  );
}
