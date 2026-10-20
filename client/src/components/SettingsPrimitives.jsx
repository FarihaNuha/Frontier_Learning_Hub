import { useId } from 'react';

export function SettingsCard({ title, description, icon: Icon, children, className = '' }) {
  const id = useId();
  return <section className={`settings-card ${className}`} aria-labelledby={id}>
    <header className="settings-card-heading">
      {Icon && <span className="settings-section-icon"><Icon aria-hidden="true" /></span>}
      <div><h2 id={id}>{title}</h2>{description && <p>{description}</p>}</div>
    </header>
    {children}
  </section>;
}

export function SettingToggle({ title, description, checked, onChange }) {
  const id = useId();
  return <div className="settings-row">
    <div><span id={id} className="settings-row-title">{title}</span><p id={`${id}-help`}>{description}</p></div>
    <button className="settings-switch" type="button" role="switch" aria-checked={Boolean(checked)} aria-labelledby={id} aria-describedby={`${id}-help`} onClick={onChange}><span /></button>
  </div>;
}
