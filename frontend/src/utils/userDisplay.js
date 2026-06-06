/** Consistent display name across sidebar, dashboard, profile, and tickets. */
export function getDisplayName(user) {
  if (!user) return 'User';
  const name = (user.name || '').trim();
  if (name) return name;
  const local = user.email?.split('@')[0];
  return local ? local.charAt(0).toUpperCase() + local.slice(1) : 'User';
}

export function getInitials(user) {
  const name = getDisplayName(user);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function formatJoinedDate(createdAt) {
  if (!createdAt) return '—';
  return new Date(createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
