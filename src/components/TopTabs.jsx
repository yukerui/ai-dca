export function TopTabs({ activeKey, tabs }) {
  return (
    <nav className="top-tabs" aria-label="主导航">
      {tabs.map((tab) => (
        <a key={tab.key} className={tab.key === activeKey ? 'top-tab is-active' : 'top-tab'} href={tab.href}>
          {tab.label}
        </a>
      ))}
    </nav>
  );
}
