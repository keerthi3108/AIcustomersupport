export default function BarChart({ data, labelKey = 'label', valueKey = 'value' }) {
  if (!data?.length) return <p className="muted">No data</p>;
  const max = Math.max(...data.map((d) => d[valueKey]), 1);
  return (
    <div className="bar-chart">
      {data.map((d) => (
        <div key={d[labelKey]} className="bar-row">
          <span className="bar-label">{d[labelKey]}</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(d[valueKey] / max) * 100}%` }} />
          </div>
          <span className="bar-value">{d[valueKey]}</span>
        </div>
      ))}
    </div>
  );
}
