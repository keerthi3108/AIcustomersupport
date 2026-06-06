import { getInitials } from '../utils/userDisplay';

export default function UserAvatar({ user, size = 'md', className = '' }) {
  const initials = getInitials(user);
  return (
    <span className={`user-avatar user-avatar-${size} ${className}`.trim()} aria-hidden="true">
      {initials}
    </span>
  );
}
