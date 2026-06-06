import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ticketApi } from '../../api/client';
import AiSourcesAccordion from '../../components/AiSourcesAccordion';
import StatusBadge from '../../components/StatusBadge';
import TicketChat from '../../components/TicketChat';
import { useToast } from '../../context/ToastContext';

function SlaAdminPanel({ ticket }) {
  const hours = ticket.sla_hours_remaining;
  const breached = ticket.sla_breached || (hours !== null && hours !== undefined && hours < 0);
  const timeLabel =
    hours === null || hours === undefined
      ? '—'
      : breached
        ? `Overdue by ${Math.abs(hours).toFixed(1)}h`
        : `${hours.toFixed(1)}h remaining`;

  return (
    <div className="sla-admin-panel">
      <h4>SLA Tracking</h4>
      <dl className="sla-dl">
        <div>
          <dt>Status</dt>
          <dd>
            <span className={`sla-pill ${breached ? 'sla-bad' : ticket.sla_status === 'At Risk' ? 'sla-warn' : 'sla-ok'}`}>
              {ticket.sla_status}
            </span>
          </dd>
        </div>
        <div>
          <dt>Deadline</dt>
          <dd>{ticket.sla_deadline ? new Date(ticket.sla_deadline).toLocaleString() : '—'}</dd>
        </div>
        <div>
          <dt>Time</dt>
          <dd>{timeLabel}</dd>
        </div>
        {ticket.resolution_hours != null && (
          <div>
            <dt>Resolved in</dt>
            <dd>{ticket.resolution_hours}h</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

export default function TicketDetail({ adminView = false }) {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(5);
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

  const handleSend = async (e) => {
    e.preventDefault();
    const text = message.trim();
    if (text.length < 2) return;
    setSending(true);
    try {
      const updated = adminView
        ? await ticketApi.reply(id, text)
        : await ticketApi.sendMessage(id, text);
      setTicket(updated);
      setMessage('');
      showToast(adminView ? 'Reply sent' : 'Message sent', 'success');
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

  if (!ticket) return <p className="muted pad">Loading conversation...</p>;

  const isResolved = ticket.status === 'Resolved';
  const canReply = !isResolved;

  return (
    <div className="page ticket-chat-page">
      <header className="chat-page-header">
        <div>
          <p className="chat-ticket-id">Ticket #{ticket.id}</p>
          <h1>{ticket.title}</h1>
          <div className="badge-row">
            <StatusBadge value={ticket.status} />
            <StatusBadge value={ticket.priority} type="priority" />
            {adminView && (
              <>
                <StatusBadge value={ticket.category} type="category" />
                <StatusBadge value={ticket.sentiment} type="sentiment" />
              </>
            )}
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

      <div className="chat-layout">
        <aside className="chat-sidebar">
          <div className="card chat-info-card">
            <h3>About this request</h3>
            <p className="chat-original-issue">{ticket.description}</p>
            <p className="muted small">Opened {new Date(ticket.created_at).toLocaleString()}</p>
            {adminView && ticket.user_name && (
              <p className="chat-customer">
                <strong>Customer:</strong> {ticket.user_name}
              </p>
            )}
          </div>

          {adminView && <SlaAdminPanel ticket={ticket} />}

          <AiSourcesAccordion sources={ticket.sources} adminView={adminView} />
        </aside>

        <section className="chat-panel card">
          <div className="chat-panel-head">
            <h2>Support Conversation</h2>
            <span className="muted small">
              {isResolved ? 'This ticket is resolved' : 'Continue the conversation until your issue is fixed'}
            </span>
          </div>

          <TicketChat messages={ticket.messages} adminView={adminView} />

          {canReply ? (
            <form className="chat-composer" onSubmit={handleSend}>
              <textarea
                rows={3}
                placeholder={
                  adminView
                    ? 'Type your reply to the customer...'
                    : 'Ask a follow-up question or share more details...'
                }
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={sending}
              />
              <div className="chat-composer-bar">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={sending || message.trim().length < (adminView ? 5 : 2)}
                >
                  {sending ? 'Sending...' : adminView ? 'Send reply' : 'Send message'}
                </button>
              </div>
            </form>
          ) : (
            <div className="chat-composer chat-composer-disabled">
              <p className="muted">
                This ticket is resolved.{' '}
                {!adminView && 'Create a new ticket if you need further assistance.'}
              </p>
            </div>
          )}
        </section>
      </div>

      {!adminView && isResolved && !ticket.feedback_rating && (
        <section className="card feedback-card">
          <h3>How was your support experience?</h3>
          <input type="range" min={1} max={5} value={rating} onChange={(e) => setRating(+e.target.value)} />
          <span>{rating}/5</span>
          <button className="btn btn-primary btn-sm" onClick={submitFeedback}>
            Submit feedback
          </button>
        </section>
      )}
    </div>
  );
}
