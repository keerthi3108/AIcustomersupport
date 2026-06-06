import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ticketApi } from '../../api/client';
import StatusBadge from '../../components/StatusBadge';
import { useToast } from '../../context/ToastContext';

const SENDER_LABELS = {
  user: 'Customer',
  ai: 'AI Assistant',
  admin: 'Support Agent',
};

function formatMessageContent(content) {
  if (!content) return '';
  return content.split('\n').map((line, i) => (
    <span key={i}>
      {line}
      {i < content.split('\n').length - 1 && <br />}
    </span>
  ));
}

export default function TicketDetail({ adminView = false }) {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [rating, setRating] = useState(5);
  const [adminReply, setAdminReply] = useState('');
  const [sending, setSending] = useState(false);
  const { showToast } = useToast();

  const load = () => ticketApi.get(id).then(setTicket).catch((e) => showToast(e.message, 'error'));

  useEffect(() => {
    load();
  }, [id]);

  const handleStatus = async (status) => {
    try {
      const updated = await ticketApi.update(id, { status });
      setTicket(updated);
      showToast(`Status updated to ${status}`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleAdminReply = async (e) => {
    e.preventDefault();
    const text = adminReply.trim();
    if (text.length < 5) {
      showToast('Reply must be at least 5 characters', 'error');
      return;
    }
    setSending(true);
    try {
      const updated = await ticketApi.reply(id, text);
      setTicket(updated);
      setAdminReply('');
      showToast('Reply sent to customer', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSending(false);
    }
  };

  const submitFeedback = async () => {
    try {
      await ticketApi.feedback(id, rating);
      showToast('Thank you for your feedback!', 'success');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  if (!ticket) return <p className="muted pad">Loading ticket...</p>;

  return (
    <div className="page ticket-detail">
      <header className="page-header">
        <div>
          <h1>#{ticket.id} {ticket.title}</h1>
          <div className="badge-row">
            <StatusBadge value={ticket.status} />
            <StatusBadge value={ticket.priority} type="priority" />
            <StatusBadge value={ticket.category} type="category" />
            <StatusBadge value={ticket.sentiment} type="sentiment" />
            <span className="sla-pill">{ticket.sla_status}</span>
          </div>
        </div>
        {adminView && (
          <div className="admin-actions">
            <button className="btn btn-secondary btn-sm" onClick={() => handleStatus('In Progress')}>
              In Progress
            </button>
            <button className="btn btn-warning btn-sm" onClick={() => handleStatus('Escalated')}>
              Escalate
            </button>
            <button className="btn btn-success btn-sm" onClick={() => handleStatus('Resolved')}>
              Resolve
            </button>
          </div>
        )}
      </header>

      <div className="detail-grid">
        <section className="card">
          <h2>Ticket Information</h2>
          <p>{ticket.description}</p>
          <dl className="meta-list">
            <div>
              <dt>Created</dt>
              <dd>{new Date(ticket.created_at).toLocaleString()}</dd>
            </div>
            <div>
              <dt>SLA Deadline</dt>
              <dd>{ticket.sla_deadline ? new Date(ticket.sla_deadline).toLocaleString() : '—'}</dd>
            </div>
            {adminView && (
              <div>
                <dt>Customer</dt>
                <dd>{ticket.user_name}</dd>
              </div>
            )}
          </dl>
        </section>

        {adminView && (
          <section className="card ai-panel admin-ai-preview">
            <h2>AI-Generated Response</h2>
            <p className="section-desc muted">Initial automated reply (for admin reference)</p>
            <div className="ai-response">{ticket.ai_response || 'No AI response generated.'}</div>
          </section>
        )}

        {!adminView && (
          <section className="card ai-panel">
            <h2>Support Response</h2>
            <p className="section-desc muted">AI-generated reply based on your request</p>
            <div className="ai-response">{ticket.ai_response || 'No response generated.'}</div>
          </section>
        )}

        {adminView && ticket.sources?.length > 0 && (
          <section className="card sources-panel">
            <h2>Reference Sources</h2>
            <p className="section-desc muted">Documents used for AI grounding</p>
            <ul className="source-list">
              {ticket.sources.map((s) => (
                <li key={s.id}>
                  <strong>{s.filename}</strong>
                  <span className="score">{(s.relevance_score * 100).toFixed(0)}% match</span>
                  <p>{s.chunk_preview}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {!adminView && (
          <section className="card sources-panel">
            <h2>Reference Sources</h2>
            <p className="section-desc muted">Internal documents used as grounding evidence</p>
            {ticket.sources?.length ? (
              <ul className="source-list">
                {ticket.sources.map((s) => (
                  <li key={s.id}>
                    <strong>{s.filename}</strong>
                    <span className="score">{(s.relevance_score * 100).toFixed(0)}% match</span>
                    <p>{s.chunk_preview}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No relevant knowledge sources retrieved.</p>
            )}
          </section>
        )}

        <section className="card timeline-card timeline-card-wide">
          <h2>Conversation</h2>
          <p className="section-desc muted">
            {adminView
              ? 'Full thread visible to the customer. Send a manual reply below.'
              : 'Messages from you, our AI, and support agents'}
          </p>
          <div className="timeline">
            {ticket.messages?.length ? (
              ticket.messages.map((m) => (
                <div key={m.id} className={`timeline-item ${m.sender}`}>
                  <div className="timeline-item-head">
                    <span className="timeline-sender">{SENDER_LABELS[m.sender] || m.sender}</span>
                    <small>{new Date(m.created_at).toLocaleString()}</small>
                  </div>
                  <div className="timeline-body">{formatMessageContent(m.content)}</div>
                </div>
              ))
            ) : (
              <p className="muted">No messages yet.</p>
            )}
          </div>

          {adminView && (
            <form className="admin-reply-form" onSubmit={handleAdminReply}>
              <h3>Reply to customer</h3>
              <textarea
                rows={5}
                placeholder="Type your response to the customer..."
                value={adminReply}
                onChange={(e) => setAdminReply(e.target.value)}
                required
                minLength={5}
              />
              <div className="admin-reply-actions">
                <button type="submit" className="btn btn-primary" disabled={sending || !adminReply.trim()}>
                  {sending ? 'Sending...' : 'Send reply'}
                </button>
                <span className="muted small">Customer will see this in their ticket timeline</span>
              </div>
            </form>
          )}
        </section>
      </div>

      {!adminView && ticket.status === 'Resolved' && !ticket.feedback_rating && (
        <section className="card feedback-card">
          <h3>Rate this AI response</h3>
          <input type="range" min={1} max={5} value={rating} onChange={(e) => setRating(+e.target.value)} />
          <span>{rating}/5</span>
          <button className="btn btn-primary btn-sm" onClick={submitFeedback}>
            Submit Feedback
          </button>
        </section>
      )}
    </div>
  );
}
