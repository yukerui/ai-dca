import { TopTabs } from './TopTabs.jsx';
import { SideNav } from './SideNav.jsx';

export function AppShell({ activeTab, tabs, sideNav, headerMeta, screen, children }) {
  const shellClass = screen?.device === 'MOBILE' ? 'app-shell is-mobile' : 'app-shell';
  const eyebrow = screen?.device === 'MOBILE' ? '移动端策略页' : '投资策略面板';

  return (
    <div className={shellClass}>
      <SideNav {...sideNav} />
      <div className="app-shell__main">
        <header className="app-header">
          <div>
            <div className="app-header__eyebrow">{eyebrow}</div>
            <TopTabs activeKey={activeTab} tabs={tabs} />
          </div>
          <div className="app-header__meta">
            {headerMeta?.map((item) => (
              <div key={item.label} className="app-header__pill">
                <span className="app-header__pill-label">{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </header>
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
