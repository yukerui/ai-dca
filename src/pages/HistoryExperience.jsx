import { buildStages, formatCurrency, readAccumulationState } from '../app/accumulation.js';
import { createTopTabs } from '../app/screens.js';
import { AppShell } from '../components/AppShell.jsx';
import { StatCard } from '../components/StatCard.jsx';

const sampleHistory = [
  { date: '2026-03-22', type: '买入', shares: 8.4, price: 573.18, status: '已成交' },
  { date: '2026-03-15', type: '买入', shares: 9.7, price: 559.21, status: '已成交' },
  { date: '2026-03-01', type: '买入', shares: 10.2, price: 601.3, status: '已成交' },
  { date: '2026-02-11', type: '观察', shares: 0, price: 548.4, status: '未触发' }
];

export function HistoryExperience({ screen, links, inPagesDir }) {
  const accumulationState = readAccumulationState();
  const accumulation = buildStages(accumulationState);
  const totalShares = sampleHistory.reduce((sum, row) => sum + row.shares, 0);
  const totalInvestment = sampleHistory.reduce((sum, row) => sum + row.shares * row.price, 0);
  const tabs = createTopTabs({ inPagesDir });

  return (
    <AppShell
      activeTab="accumEdit"
      tabs={tabs}
      sideNav={{
        title: '历史模块',
        subtitle: '执行记录同步',
        items: [
          { label: '策略总览', icon: '▣', href: links.home },
          { label: '加仓配置', icon: '◉', href: links.accumEdit },
          { label: '交易历史', icon: '↺', href: links.history, active: true },
          { label: '定投计划', icon: '◌', href: links.dca },
          { label: '页面目录', icon: '☰', href: links.catalog }
        ],
        footer: <a className="side-nav__cta" href={links.accumEdit}>返回加仓配置</a>
      }}
      headerMeta={[
        { label: '标的', value: accumulationState.symbol },
        { label: '记录数', value: `${sampleHistory.length} 条` },
        { label: '状态', value: '已同步' }
      ]}
      screen={screen}
    >
      <section className="page-section page-section--hero">
        <div>
          <div className="page-eyebrow">交易历史页</div>
          <h1 className="page-title">{screen.title}</h1>
          <p className="page-copy">历史页和加仓配置页共用一套壳层与导航配置。交易摘要读取同一份加仓状态，所以预算、平均成本和层级数量能保持同步。</p>
        </div>
        <div className="hero-grid">
          <StatCard label="累计股数" value={`${totalShares.toFixed(2)} 股`} note="基于最近交易记录" tone="primary" />
          <StatCard label="累计金额" value={formatCurrency(totalInvestment)} note="历史记录中的已执行交易" />
          <StatCard label="当前平均成本" value={formatCurrency(accumulation.averageCost)} note={`当前共 ${accumulation.stages.length} 层`} />
        </div>
      </section>

      <section className="panel panel--table">
        <div className="panel__header">
          <div>
            <div className="panel__eyebrow">交易明细</div>
            <h2 className="panel__title">最近执行记录</h2>
          </div>
          <div className="button-row">
            <button className="ghost-button" type="button">导出报告</button>
            <button className="ghost-button" type="button">筛选日期</button>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>日期</th>
              <th>类型</th>
              <th>数量</th>
              <th>价格</th>
              <th>金额</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {sampleHistory.map((row) => (
              <tr key={`${row.date}-${row.type}`}>
                <td>{row.date}</td>
                <td>{row.type}</td>
                <td>{row.shares > 0 ? `${row.shares.toFixed(2)} 股` : '-'}</td>
                <td>{formatCurrency(row.price)}</td>
                <td>{row.shares > 0 ? formatCurrency(row.shares * row.price) : '-'}</td>
                <td>{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="content-grid content-grid--history">
        <section className="panel">
          <div className="panel__header">
            <div>
              <div className="panel__eyebrow">当前层级</div>
              <h2 className="panel__title">最新加仓模型快照</h2>
            </div>
          </div>
          <div className="schedule-list">
            {accumulation.stages.map((stage) => (
              <div key={stage.id} className="schedule-item">
                <div>
                  <strong>{stage.label}</strong>
                  <span>{formatCurrency(stage.price)} · {stage.weightPercent.toFixed(1)}%</span>
                </div>
                <div>
                  <strong>{formatCurrency(stage.amount)}</strong>
                  <span>{formatCurrency(stage.shares, '', 3)} 股</span>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel__header">
            <div>
              <div className="panel__eyebrow">统一结构</div>
              <h2 className="panel__title">迁移后的行为</h2>
            </div>
          </div>
          <ul className="bullet-list">
            <li>顶栏主 tab 与加仓配置页完全一致，页面切换时不再出现不同的导航体系。</li>
            <li>交易历史摘要直接读取共享加仓状态，预算和平均成本会随配置页联动更新。</li>
            <li>当前版本：{screen.title}。后续新增页面只需要补充屏幕元数据，不需要再复制整页 HTML。</li>
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
