import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../../api/client';
import { useToast } from '../../context/ToastContext';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await authApi.forgotPassword({ email });
      setSent(true);
      showToast('Check your email for reset instructions', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card animate-in">
        <div className="auth-brand">
          <h1>Reset password</h1>
          <p>{sent ? 'If an account exists, we sent instructions.' : 'Enter your email to receive a reset link'}</p>
        </div>
        {!sent && (
          <form onSubmit={handleSubmit} className="auth-form">
            <label>
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <button type="submit" className="btn btn-primary btn-block">
              Send reset link
            </button>
          </form>
        )}
        <div className="auth-links">
          <Link to="/login">Back to login</Link>
        </div>
      </div>
    </div>
  );
}
