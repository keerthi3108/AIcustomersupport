export default function StatCard({ title, value, subtitle, trend, variant = 'default' }) {
  return (
    <div className={`stat-card stat-${variant} animate-in`}>
      <div className="stat-header">
        <span className="stat-title">{title}</span>
        {trend && <span className={`stat-trend ${trend > 0 ? 'up' : 'down'}`}>{trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%</span>}
      </div>
      <div className="stat-value">{value}</div>
      {subtitle && <div className="stat-subtitle">{subtitle}</div>}
    </div>
  );
}
