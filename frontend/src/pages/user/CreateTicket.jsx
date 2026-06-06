import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ticketApi } from '../../api/client';
import { useToast } from '../../context/ToastContext';

export default function CreateTicket() {
  const [form, setForm] = useState({ title: '', description: '', priority: 'Medium' });
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const ticket = await ticketApi.create(form);
      showToast('Ticket created — AI response generated', 'success');
      navigate(`/tickets/${ticket.id}`);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Create Ticket</h1>
          <p className="muted">AI will classify, analyze sentiment, and generate a grounded response</p>
        </div>
      </header>
      <form className="card form-card" onSubmit={handleSubmit}>
        <label>
          Title
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required minLength={3} />
        </label>
        <label>
          Priority
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
          </select>
        </label>
        <label>
          Description
          <textarea
            rows={8}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
            minLength={10}
            placeholder="Describe your issue in detail..."
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Processing with AI...' : 'Submit Ticket'}
        </button>
      </form>
    </div>
  );
}
