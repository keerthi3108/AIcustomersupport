import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ticketApi } from '../../api/client';
import Modal from '../../components/Modal';
import StatusBadge from '../../components/StatusBadge';
import { useToast } from '../../context/ToastContext';

export default function AdminTickets() {
  const [tickets, setTickets] = useState([]);
  const [filters, setFilters] = useState({ status: '', priority: '', category: '' });
  const [selected, setSelected] = useState(null);
  const { showToast } = useToast();

  const load = () => ticketApi.all(filters).then(setTickets).catch((e) => showToast(e.message, 'error'));

  useEffect(() => {
    load();
  }, [filters]);

  const updateTicket = async (status) => {
    try {
      await ticketApi.update(selected.id, { status });
      showToast('Ticket updated', 'success');
      setSelected(null);
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Ticket Management</h1>
      </header>
      <div className="filters-bar">
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">Status</option>
          <option>Open</option>
          <option>In Progress</option>
          <option>Resolved</option>
          <option>Escalated</option>
        </select>
        <select value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}>
          <option value="">Priority</option>
          <option>Low</option>
          <option>Medium</option>
          <option>High</option>
        </select>
        <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
          <option value="">Category</option>
          <option>Billing</option>
          <option>Technical</option>
          <option>Account</option>
          <option>General</option>
        </select>
      </div>
      <div className="data-table-wrap card">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Category</th>
              <th>Priority</th>
              <th>Status</th>
              <th>SLA</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id}>
                <td>#{t.id}</td>
                <td>
                  <Link to={`/admin/tickets/${t.id}`}>{t.title}</Link>
                </td>
                <td>{t.category}</td>
                <td>{t.priority}</td>
                <td>
                  <StatusBadge value={t.status} />
                </td>
                <td>{t.sla_breached ? 'Breached' : 'OK'}</td>
                <td>
                  <button className="btn btn-ghost btn-sm" onClick={() => setSelected(t)}>
                    Manage
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal
        open={!!selected}
        title={selected ? `Manage #${selected.id}` : ''}
        onClose={() => setSelected(null)}
        footer={
          selected && (
            <>
              <button className="btn btn-secondary" onClick={() => updateTicket('In Progress')}>
                In Progress
              </button>
              <button className="btn btn-warning" onClick={() => updateTicket('Escalated')}>
                Escalate
              </button>
              <button className="btn btn-success" onClick={() => updateTicket('Resolved')}>
                Close
              </button>
            </>
          )
        }
      >
        {selected && <p>Update status for: {selected.title}</p>}
      </Modal>
    </div>
  );
}
