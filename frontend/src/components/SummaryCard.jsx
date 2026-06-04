export default function SummaryCard({ title, value, subtitle }) {
  return (
    <div className="card">
      <div className="muted">{title}</div>
      <div className="big">{value}</div>
      {subtitle ? <div className="small">{subtitle}</div> : null}
    </div>
  );
}
