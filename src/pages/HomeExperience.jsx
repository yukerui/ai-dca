import { buildStages, formatCurrency, formatPercent, readAccumulationState } from '../app/accumulation.js';
import { buildDcaProjection, readDcaState } from '../app/dca.js';
import { createTopTabs, screens } from '../app/screens.js';
import { buildPlan, readPlanState } from '../app/plan.js';
import { AppShell } from '../components/AppShell.jsx';
import { StatCard } from '../components/StatCard.jsx';

export function HomeExperience({ screen, links, inPagesDir }) {
  const accumulationState = readAccumulationState();
  const accumulation = buildStages(accumulationState);
  const planState = readPlanState();
  const plan = buildPlan(planState);
  const dcaState = readDcaState();
  const dca = buildDcaProjection(dcaState);
  const tabs = createTopTabs({ inPagesDir });
  const nextBuyPrice = accumulation.stages[1]?.price ?? accumulationState.basePrice;
  const screenVariants = screens.filter((item) => item.group === 'home' && item.id !== screen.id).slice(0, 5);

  return (
    <AppShell
      activeTab="home"
      tabs={tabs}
      sideNav={{
        title: '总览模块',
        subtitle: '统一多页面应用',
        items: [
          { label: '策略总览', icon: '▣', href: links.home, active: true },
          { label: '初始建仓', icon: '◎', href: links.accumNew },
          { label: '加仓配置', icon: '◉', href: links.accumEdit },
          { label: '定投计划', icon: '◌', href: links.dca },
          { label: '交易历史', icon: '↺', href: links.history }
        ],
        footer: <a className="side-nav__cta" href={links.catalog}>页面目录</a>
      }}
      headerMeta={[
        { label: '设备', value: screen.deviceLabel },
        { label: '建仓层级', value: `${accumulation.stages.length} 层` },
        { label: '定投频率', value: dcaState.frequency }
      ]}
      screen={screen}
    >
      <section className="page-section page-section--hero">
        <div>
          <div className="page-eyebrow">React 统一封面</div>
          <h1 className="page-title">{screen.title}</h1>
          <p className="page-copy">首页、加仓、建仓和定投页面都已迁到同一套 React 组件架构。当前页面来自同一个共享模板，不再依赖 Stitch 导出的静态 HTML。</p>
        </div>
        <div className="hero-grid">
          <StatCard label="建仓总预算" value={formatCurrency(planState.totalBudget)} note={`现金留存 ${formatPercent(planState.cashReservePct, 0)}`} tone="primary" />
          <StatCard label="下次买入价" value={formatCurrency(nextBuyPrice)} note={`末层跌幅 ${formatPercent(accumulationState.maxDrawdown, 2)}`} />
          <StatCard label="定投总投入" value={formatCurrency(dca.totalInvestment)} note={`${dca.executionCount} 次执行 · ${dca.cadenceLabel}`} />
        </div>
      </section>

      <div className="content-grid">
        <section className="panel">
          <div className="panel__header">
            <div>
              <div className="panel__eyebrow">统一入口</div>
              <h2 className="panel__title">核心操作</h2>
            </div>
          </div>
          <div className="action-grid">
            <a className="action-card" href={links.accumNew}>
              <strong>初始建仓</strong>
              <span>配置总预算、现金留存和首笔价格。</span>
            </a>
            <a className="action-card" href={links.accumEdit}>
              <strong>加仓配置</strong>
              <span>按权重自动反推出各层入场价格。</span>
            </a>
            <a className="action-card" href={links.dca}>
              <strong>定投计划</strong>
              <span>计算执行次数和累计投入金额。</span>
            </a>
            <a className="action-card" href={links.history}>
              <strong>交易历史</strong>
              <span>查看最近执行记录和当前层级快照。</span>
            </a>
          </div>
          <div className="panel__split">
            <div>
              <div className="panel__eyebrow">当前版本</div>
              <p className="page-note">{screen.title}</p>
            </div>
            <div>
              <div className="panel__eyebrow">同组页面</div>
              <div className="pill-list">
                {screenVariants.map((item) => (
                  <a key={item.id} className="pill-link" href={`./${item.id}.html`}>{item.title}</a>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="panel panel--table">
          <div className="panel__header">
            <div>
              <div className="panel__eyebrow">加仓摘要</div>
              <h2 className="panel__title">当前分层执行计划</h2>
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>阶段</th>
                <th>权重</th>
                <th>跌幅</th>
                <th>入场价格</th>
                <th>计划金额</th>
              </tr>
            </thead>
            <tbody>
              {accumulation.stages.map((stage, index) => (
                <tr key={stage.id}>
                  <td>{stage.label}</td>
                  <td>{formatPercent(stage.weightPercent, 1)}</td>
                  <td>{index === 0 ? '基准' : formatPercent(stage.drawdown, 2)}</td>
                  <td>{formatCurrency(stage.price)}</td>
                  <td>{formatCurrency(stage.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <div className="content-grid content-grid--history">
        <section className="panel">
          <div className="panel__header">
            <div>
              <div className="panel__eyebrow">定投预览</div>
              <h2 className="panel__title">最近几次执行</h2>
            </div>
          </div>
          <div className="schedule-list">
            {dca.schedule.map((row) => (
              <div key={row.id} className="schedule-item">
                <div>
                  <strong>{row.label}</strong>
                  <span>{row.note}</span>
                </div>
                <div>
                  <strong>{formatCurrency(row.contribution)}</strong>
                  <span>累计 {formatCurrency(row.cumulative)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel__header">
            <div>
              <div className="panel__eyebrow">迁移说明</div>
              <h2 className="panel__title">当前站点结构</h2>
            </div>
          </div>
          <ul className="bullet-list">
            <li>全部页面现在都由 React 页面配置驱动，而不是保留每张 Stitch 导出的静态 HTML。</li>
            <li>目录页不再依赖截图预览，页面清单直接来自内建的屏幕元数据。</li>
            <li>建仓、加仓和定投共用一套导航、侧栏和样式变量，后续继续改版只需要改源码，不需要回收 Stitch 导出文件。</li>
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
