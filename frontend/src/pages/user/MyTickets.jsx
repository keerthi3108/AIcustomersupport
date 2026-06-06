import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ticketApi } from '../../api/client';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';

export default function MyTickets() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const status = searchParams.get('status') || '';
  const category = searchParams.get('category') || '';
  const search = searchParams.get('search') || '';

  useEffect(() => {
    setLoading(true);
    ticketApi
      .my({ status, category, search })
      .then(setTickets)
      .finally(() => setLoading(false));
  }, [status, category, search]);

  return (
    <div className="page">
      <header className="page-header">
        <h1>My Tickets</h1>
      </header>
      <div className="filters-bar">
        <select value={status} onChange={(e) => setSearchParams({ status: e.target.value, category, search })}>
          <option value="">All statuses</option>
          <option>Open</option>
          <option>In Progress</option>
          <option>Resolved</option>
          <option>Escalated</option>
        </select>
        <select value={category} onChange={(e) => setSearchParams({ status, category: e.target.value, search })}>
          <option value="">All categories</option>
          <option>Billing</option>
          <option>Technical</option>
          <option>Account</option>
          <option>General</option>
        </select>
      </div>
      {loading ? (
        <p className="muted">Loading...</p>
      ) : tickets.length === 0 ? (
        <EmptyState
          title="No tickets found"
          description="Try adjusting filters or create a new ticket."
          action={<Link to="/tickets/new" className="btn btn-primary">Create Ticket</Link>}
        />
      ) : (
        <div className="data-table-wrap card">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Sentiment</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id}>
                  <td>
                    <Link to={`/tickets/${t.id}`}>#{t.id}</Link>
                  </td>
                  <td>{t.title}</td>
                  <td>{t.category}</td>
                  <td>{t.priority}</td>
                  <td>
                    <StatusBadge value={t.status} />
                  </td>
                  <td>
                    <StatusBadge value={t.sentiment} type="sentiment" />
                  </td>
                  <td>{new Date(t.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
