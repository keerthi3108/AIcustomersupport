import { useState } from 'react';

export default function AiSourcesAccordion({ sources = [], adminView = false }) {
  const [open, setOpen] = useState(false);

  if (!sources.length) return null;

  return (
    <div className="sources-accordion card">
      <button type="button" className="sources-accordion-toggle" onClick={() => setOpen(!open)}>
        <span>View AI Sources</span>
        <span className="sources-count">{sources.length} document{sources.length !== 1 ? 's' : ''}</span>
        <span className={`accordion-chevron ${open ? 'open' : ''}`}>›</span>
      </button>
      {open && (
        <div className="sources-accordion-body">
          <p className="muted small">
            {adminView
              ? 'Technical RAG retrieval details for admin reference.'
              : 'Documents our AI used to help answer your questions.'}
          </p>
          <ul className="source-list">
            {sources.map((s) => (
              <li key={s.id}>
                {adminView && (
                  <>
                    <strong>{s.filename}</strong>
                    <span className="score">{(s.relevance_score * 100).toFixed(0)}% relevance</span>
                  </>
                )}
                {!adminView && <span className="source-topic">Knowledge article</span>}
                <p>{s.chunk_preview}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
