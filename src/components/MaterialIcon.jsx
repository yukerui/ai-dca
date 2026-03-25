export function MaterialIcon({ name, filled = false, className = '', ariaHidden = true }) {
  const classes = ['material-symbols-outlined', filled ? 'is-filled' : '', className].filter(Boolean).join(' ');
  return (
    <span aria-hidden={ariaHidden} className={classes}>
      {name}
    </span>
  );
}
