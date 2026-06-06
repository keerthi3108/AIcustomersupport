import { useEffect, useState } from 'react';
import { analyticsApi } from '../../api/client';
import BarChart from '../../components/BarChart';
import StatCard from '../../components/StatCard';

export default function Analytics() {
  const [data, setData] = useState(null);
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    analyticsApi.overview().then(setData);
    analyticsApi.evaluation().then(setMetrics);
  }, []);

  if (!data) return <p className="muted pad">Loading analytics...</p>;

  return (
    <div className="page">
      <header className="page-header">
        <h1>Analytics Dashboard</h1>
        <p className="muted">SLA performance, trends, and AI evaluation metrics</p>
      </header>

      <div className="stat-grid">
        <StatCard title="SLA Compliance" value={`${data.sla_compliance_percent}%`} variant="primary" />
        <StatCard title="Avg Resolution" value={`${data.avg_resolution_hours}h`} />
        {metrics && (
          <>
            <StatCard title="Classification Accuracy" value={`${metrics.classification_accuracy}%`} />
            <StatCard title="Retrieval Accuracy" value={`${metrics.retrieval_accuracy}%`} />
            <StatCard title="Avg Response Time" value={`${metrics.avg_response_time_ms}ms`} />
            <StatCard title="User Feedback" value={`${metrics.avg_feedback_rating}/5`} />
          </>
        )}
      </div>

      <div className="dashboard-grid">
        <section className="card">
          <h2>Monthly Ticket Trends</h2>
          <BarChart data={data.monthly_trends} />
        </section>
        <section className="card">
          <h2>Sentiment Distribution</h2>
          <BarChart data={data.sentiment_distribution} />
        </section>
        <section className="card">
          <h2>Category Distribution</h2>
          <BarChart data={data.category_chart} />
        </section>
        <section className="card">
          <h2>Resolution Time Analysis</h2>
          <BarChart data={data.resolution_time_analysis} />
        </section>
        <section className="card">
          <h2>SLA Performance</h2>
          <BarChart data={data.sla_performance} />
        </section>
      </div>
    </div>
  );
}
