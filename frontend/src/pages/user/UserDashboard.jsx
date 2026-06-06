import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { analyticsApi, ticketApi } from '../../api/client';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import UserAvatar from '../../components/UserAvatar';
import { useAuth } from '../../context/AuthContext';
import { getDisplayName } from '../../utils/userDisplay';

export default function UserDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const displayName = getDisplayName(user);

  useEffect(() => {
    ticketApi.summary().then(setSummary).catch(console.error);
    ticketApi.my().then((t) => setTickets(t.slice(0, 5))).catch(console.error);
    analyticsApi.evaluation().then(setMetrics).catch(console.error);
  }, []);

  return (
    <div className="page">
      <section className="welcome-banner card animate-in">
        <div className="welcome-content">
          <UserAvatar user={user} size="lg" />
          <div>
            <p className="welcome-label">Welcome back</p>
            <h1>{displayName}</h1>
            <p className="muted">Here&apos;s an overview of your support activity</p>
          </div>
        </div>
        <div className="welcome-meta">
          <span className="welcome-stat">
            <strong>{summary?.open ?? 0}</strong> open tickets
          </span>
        </div>
      </section>

      <div className="stat-grid">
        <StatCard title="Total Tickets" value={summary?.total ?? '—'} variant="primary" />
        <StatCard title="Open" value={summary?.open ?? '—'} variant="warning" />
        <StatCard title="Resolved" value={summary?.resolved ?? '—'} variant="success" />
        <StatCard title="Escalated" value={summary?.escalated ?? '—'} variant="danger" />
      </div>

      {metrics && (
        <div className="card metrics-strip animate-in">
          <span>AI Response: ~{metrics.avg_response_time_ms}ms</span>
          <span>Retrieval: {metrics.retrieval_accuracy}%</span>
          <span>Avg Rating: {metrics.avg_feedback_rating}/5</span>
        </div>
      )}

      <section className="card card-hover">
        <div className="card-header">
          <h2>Recent Tickets</h2>
          <Link to="/tickets">View all</Link>
        </div>
        {tickets.length === 0 ? (
          <div className="empty-inline">
            <p className="muted">No tickets yet.</p>
            <Link to="/tickets/new" className="btn btn-primary btn-sm">
              Create your first ticket
            </Link>
          </div>
        ) : (
          <div className="ticket-list">
            {tickets.map((t) => (
              <Link key={t.id} to={`/tickets/${t.id}`} className="ticket-card">
                <div>
                  <strong>#{t.id} {t.title}</strong>
                  <small>{new Date(t.created_at).toLocaleString()}</small>
                </div>
                <div className="ticket-card-badges">
                  <StatusBadge value={t.status} />
                  <StatusBadge value={t.sentiment} type="sentiment" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
