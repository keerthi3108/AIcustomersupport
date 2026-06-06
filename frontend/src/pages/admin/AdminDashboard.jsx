import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { analyticsApi, ticketApi } from '../../api/client';
import BarChart from '../../components/BarChart';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import UserAvatar from '../../components/UserAvatar';
import { useAuth } from '../../context/AuthContext';
import { getDisplayName } from '../../utils/userDisplay';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [recent, setRecent] = useState([]);
  const displayName = getDisplayName(user);

  useEffect(() => {
    analyticsApi.overview().then(setData).catch(console.error);
    ticketApi.all().then((t) => setRecent(t.slice(0, 6))).catch(console.error);
  }, []);

  if (!data) return <p className="muted pad">Loading dashboard...</p>;

  return (
    <div className="page">
      <section className="welcome-banner welcome-banner-admin card animate-in">
        <div className="welcome-content">
          <UserAvatar user={user} size="lg" />
          <div>
            <p className="welcome-label">Admin console</p>
            <h1>Welcome back, {displayName}</h1>
            <p className="muted">Enterprise support operations overview</p>
          </div>
        </div>
      </section>

      <div className="stat-grid">
        <StatCard title="Total Tickets" value={data.total_tickets} variant="primary" />
        <StatCard title="Open" value={data.open_tickets} variant="warning" />
        <StatCard title="Resolved" value={data.resolved_tickets} variant="success" />
        <StatCard title="Escalated" value={data.escalated_tickets} variant="danger" />
        <StatCard title="SLA Compliance" value={`${data.sla_compliance_percent}%`} variant="primary" />
        <StatCard title="Avg Resolution" value={`${data.avg_resolution_hours}h`} subtitle="hours" />
      </div>

      <div className="dashboard-grid">
        <section className="card">
          <h2>Sentiment Overview</h2>
          <BarChart data={data.sentiment_distribution} />
        </section>
        <section className="card">
          <h2>Category Distribution</h2>
          <BarChart data={data.category_chart} />
        </section>
        <section className="card wide">
          <h2>Monthly Ticket Trends</h2>
          <BarChart data={data.monthly_trends} />
        </section>
      </div>

      <section className="card">
        <div className="card-header">
          <h2>Recent Tickets</h2>
          <Link to="/admin/tickets">Manage all</Link>
        </div>
        <div className="ticket-list">
          {recent.map((t) => (
            <Link key={t.id} to={`/admin/tickets/${t.id}`} className="ticket-card">
              <div>
                <strong>#{t.id} {t.title}</strong>
              </div>
              <StatusBadge value={t.status} />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
