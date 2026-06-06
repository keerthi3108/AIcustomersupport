import { useEffect, useRef } from 'react';

function getSenderMeta(adminView) {
  return {
    user: { label: adminView ? 'Customer' : 'You', align: 'right', className: 'bubble-user' },
    ai: { label: 'AI Assistant', align: 'left', className: 'bubble-ai' },
    admin: { label: 'Support Agent', align: 'left', className: 'bubble-admin' },
  };
}

function formatTime(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TicketChat({ messages = [], adminView = false }) {
  const SENDER_META = getSenderMeta(adminView);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!messages.length) {
    return (
      <div className="chat-messages chat-messages-empty">
        <p className="muted">No messages yet. Start the conversation below.</p>
      </div>
    );
  }

  return (
    <div className="chat-messages">
      {messages.map((m) => {
        const meta = SENDER_META[m.sender] || { label: m.sender, align: 'left', className: '' };
        return (
          <div key={m.id} className={`chat-row chat-row-${meta.align}`}>
            <div className={`chat-bubble ${meta.className}`}>
              <div className="chat-bubble-head">
                <span className="chat-sender">{meta.label}</span>
                <time className="chat-time">{formatTime(m.created_at)}</time>
              </div>
              <div className="chat-bubble-body">{m.content}</div>
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}
