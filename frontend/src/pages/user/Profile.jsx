import { useEffect, useState } from 'react';
import { userApi } from '../../api/client';
import UserAvatar from '../../components/UserAvatar';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatJoinedDate, getDisplayName } from '../../utils/userDisplay';

export default function Profile() {
  const { user, login, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    refreshUser()
      .then((u) => {
        if (u) setProfile({ name: u.name, email: u.email });
      })
      .catch(() => {});
  }, [refreshUser]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const updated = await userApi.update({
        name: profile.name.trim(),
        email: profile.email,
      });
      const token = localStorage.getItem('token');
      login(token, updated);
      setProfile({ name: updated.name, email: updated.email });
      showToast('Profile saved successfully', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      showToast('New passwords do not match', 'error');
      return;
    }
    setSavingPassword(true);
    try {
      await userApi.changePassword(passwordForm);
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      showToast('Password updated successfully', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  const displayName = getDisplayName(user);

  return (
    <div className="page profile-page">
      <header className="page-header">
        <div>
          <h1>Profile Settings</h1>
          <p className="muted">Manage your account and security preferences</p>
        </div>
      </header>

      <section className="profile-hero card card-hover animate-in">
        <UserAvatar user={user} size="xl" />
        <div className="profile-hero-info">
          <h2>{displayName}</h2>
          <p className="profile-email">{user?.email}</p>
          <div className="profile-meta-row">
            <span className="profile-meta-pill capitalize">{user?.role} account</span>
            <span className="profile-meta-pill">Joined {formatJoinedDate(user?.created_at)}</span>
          </div>
        </div>
      </section>

      <div className="profile-grid">
        <form className="card card-hover profile-section" onSubmit={handleProfileSubmit}>
          <div className="section-head">
            <h3>Personal Information</h3>
            <p className="muted">Update how your name appears across SupportAI</p>
          </div>
          <label>
            Full name
            <input
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              required
              minLength={2}
              placeholder="Your display name"
            />
          </label>
          <label>
            Email address
            <input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              required
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={savingProfile}>
            {savingProfile ? 'Saving...' : 'Save personal info'}
          </button>
        </form>

        <form className="card card-hover profile-section" onSubmit={handlePasswordSubmit}>
          <div className="section-head">
            <h3>Security Settings</h3>
            <p className="muted">Change your password to keep your account secure</p>
          </div>
          <label>
            Current password
            <input
              type="password"
              value={passwordForm.current_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
              required
              autoComplete="current-password"
            />
          </label>
          <label>
            New password
            <input
              type="password"
              value={passwordForm.new_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          <label>
            Confirm new password
            <input
              type="password"
              value={passwordForm.confirm_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          <button type="submit" className="btn btn-secondary" disabled={savingPassword}>
            {savingPassword ? 'Updating...' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}
