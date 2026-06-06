import { useEffect, useState } from 'react';
import { knowledgeApi } from '../../api/client';
import { useToast } from '../../context/ToastContext';

export default function KnowledgeBase() {
  const [docs, setDocs] = useState([]);
  const [stats, setStats] = useState(null);
  const [file, setFile] = useState(null);
  const [category, setCategory] = useState('General');
  const { showToast } = useToast();

  const load = () => {
    knowledgeApi.list().then(setDocs).catch((e) => showToast(e.message, 'error'));
    knowledgeApi.stats().then(setStats).catch(console.error);
  };

  useEffect(() => {
    load();
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('category', category);
    try {
      await knowledgeApi.upload(fd);
      showToast('Document indexed successfully', 'success');
      setFile(null);
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this document from the knowledge base?')) return;
    try {
      await knowledgeApi.remove(id);
      showToast('Document removed', 'success');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Knowledge Base</h1>
          <p className="muted">Manage RAG documents (recommended: 20–50 files)</p>
        </div>
      </header>

      {stats && (
        <div className="stat-grid compact">
          <div className="card stat-inline">
            <strong>{stats.total_documents}</strong> Documents
          </div>
          <div className="card stat-inline">
            <strong>{stats.total_chunks}</strong> Chunks
          </div>
        </div>
      )}

      <form className="card form-card upload-card" onSubmit={handleUpload}>
        <h2>Upload Document</h2>
        <div className="upload-row">
          <input type="file" accept=".pdf,.txt,.md" onChange={(e) => setFile(e.target.files[0])} />
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option>General</option>
            <option>Billing</option>
            <option>Technical</option>
            <option>Account</option>
          </select>
          <button type="submit" className="btn btn-primary" disabled={!file}>
            Upload & Index
          </button>
        </div>
        <p className="muted small">Rebuild Chroma locally before production deploy. PDF, TXT, MD supported.</p>
      </form>

      <div className="data-table-wrap card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Filename</th>
              <th>Category</th>
              <th>Chunks</th>
              <th>Uploaded</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id}>
                <td>{d.filename}</td>
                <td>{d.category}</td>
                <td>{d.chunk_count}</td>
                <td>{new Date(d.upload_date).toLocaleDateString()}</td>
                <td>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(d.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
