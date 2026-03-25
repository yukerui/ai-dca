import { GROUP_META, HOME_SCREEN_ID, PROJECT_TITLE, getGroupedScreens, pageHref, screens } from '../app/screens.js';

function screenLink(screen) {
  return screen.id === HOME_SCREEN_ID ? './index.html' : pageHref(screen.id);
}

export function CatalogPage() {
  const groups = getGroupedScreens();

  return (
    <div className="catalog-shell">
      <section className="catalog-hero">
        <div>
          <div className="page-eyebrow">统一页面目录</div>
          <h1 className="page-title">{PROJECT_TITLE}</h1>
          <p className="page-copy">站点中的全部页面都已迁到 React 多页面架构。截图目录已经移除，目录页只保留可访问页面及其分组信息。</p>
        </div>
        <div className="catalog-kpis">
          <div className="catalog-kpi">
            <strong>{screens.length}</strong>
            <span>可访问页面</span>
          </div>
          <div className="catalog-kpi">
            <strong>{groups.length}</strong>
            <span>页面分组</span>
          </div>
          <div className="catalog-kpi">
            <strong>0</strong>
            <span>截图依赖</span>
          </div>
        </div>
        <div className="button-row">
          <a className="primary-button" href="./index.html">打开封面</a>
        </div>
      </section>

      {groups.map((group) => (
        <section key={group.key} className="catalog-group">
          <div className="catalog-group__header">
            <div>
              <div className="page-eyebrow">{GROUP_META[group.key]?.label}</div>
              <h2 className="panel__title">{group.label}</h2>
              <p className="page-copy">{group.description}</p>
            </div>
            <div className="catalog-count">{group.screens.length} 页</div>
          </div>
          <div className="catalog-grid">
            {group.screens.map((screen) => (
              <a key={screen.id} className="catalog-card" href={screenLink(screen)}>
                <div className="catalog-card__meta">
                  <span>{screen.deviceLabel}</span>
                  <span>{screen.id}</span>
                </div>
                <strong>{screen.title}</strong>
                <span>{GROUP_META[screen.group]?.description}</span>
              </a>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
