export function StatCard({ label, value, note, tone = 'default' }) {
  const className = tone === 'primary' ? 'stat-card stat-card--primary' : 'stat-card';
  return (
    <section className={className}>
      <div className="stat-card__label">{label}</div>
      <div className="stat-card__value">{value}</div>
      {note ? <div className="stat-card__note">{note}</div> : null}
    </section>
  );
}
