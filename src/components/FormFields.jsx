function FieldShell({ label, helper, children }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
      {helper ? <span className="field__helper">{helper}</span> : null}
    </label>
  );
}

export function TextField({ label, value, onChange, placeholder, helper }) {
  return (
    <FieldShell label={label} helper={helper}>
      <div className="field__input-shell">
        <input type="text" value={value} onChange={onChange} placeholder={placeholder} />
      </div>
    </FieldShell>
  );
}

export function NumberField({ label, value, onChange, prefix, suffix, step = '0.01', readOnly = false, helper }) {
  return (
    <FieldShell label={label} helper={helper}>
      <div className={readOnly ? 'field__input-shell is-readonly' : 'field__input-shell'}>
        {prefix ? <span className="field__prefix">{prefix}</span> : null}
        <input type="number" step={step} value={value} onChange={onChange} readOnly={readOnly} />
        {suffix ? <span className="field__suffix">{suffix}</span> : null}
      </div>
    </FieldShell>
  );
}

export function SelectField({ label, value, onChange, options, helper }) {
  return (
    <FieldShell label={label} helper={helper}>
      <div className="field__input-shell">
        <select value={value} onChange={onChange}>
          {options.map((option) => {
            const normalized = typeof option === 'string' ? { label: option, value: option } : option;
            return (
              <option key={normalized.value} value={normalized.value}>
                {normalized.label}
              </option>
            );
          })}
        </select>
      </div>
    </FieldShell>
  );
}
