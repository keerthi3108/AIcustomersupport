export default function StatusBadge({ value, type = 'status' }) {
  const cls = `${type}-badge ${String(value).toLowerCase().replace(/\s+/g, '-')}`;
  return <span className={cls}>{value}</span>;
}
