import { buildStages, formatCurrency, formatPercent, readAccumulationState } from '../app/accumulation.js';
import { buildDcaProjection, readDcaState } from '../app/dca.js';
import { createTopTabs } from '../app/screens.js';
import { buildPlan, readPlanState } from '../app/plan.js';
import { MaterialIcon } from '../components/MaterialIcon.jsx';
import { MetricCard, StatusBadge, SurfaceCard, WorkspaceShell } from '../components/PageChrome.jsx';

const WATCHLIST = [
  { symbol: 'QQQ', price: 502.44, active: true },
  { symbol: 'VOO', price: 512.1 },
  { symbol: 'SPY', price: 560.22 }
];

const HISTORY_PLANS = [
  { name: '科技股累积', note: '平均成本: $548.05', active: true },
  { name: '股息增长', note: '平均成本: $42.10' }
];

export function HomeExperience({ screen, links, inPagesDir }) {
  const accumulationState = readAccumulationState();
  const accumulation = buildStages(accumulationState);
  const planState = readPlanState();
  const plan = buildPlan(planState);
  const dcaState = readDcaState();
  const dca = buildDcaProjection(dcaState);
  const tabs = createTopTabs({ inPagesDir });
  const nextBuyPrice = accumulation.stages[1]?.price ?? accumulationState.basePrice;
  const reserveRatio = planState.totalBudget > 0 ? plan.reserveCapital / planState.totalBudget * 100 : 0;

  return (
    <WorkspaceShell
      activeTab="home"
      tabs={tabs}
      headerRight={
        <>
          <label className="toolbar-search" aria-label="搜索市场">
            <MaterialIcon className="toolbar-search__icon" name="search" />
            <input placeholder="搜索市场..." type="text" />
          </label>
          <button className="icon-button" type="button">
            <MaterialIcon className="icon-button__icon" name="notifications" />
          </button>
          <button className="icon-button" type="button">
            <MaterialIcon className="icon-button__icon" name="settings" />
          </button>
          <div className="avatar">AT</div>
        </>
      }
      sidebar={
        <>
          <div className="sidebar-brand-card">
            <div className="sidebar-brand-card__mark">
              <MaterialIcon filled name="monitoring" />
            </div>
            <div>
              <div className="sidebar-brand-card__title">金字塔建仓追踪</div>
              <div className="sidebar-brand-card__meta">运行中的策略</div>
            </div>
          </div>

          <div className="sidebar-block">
            <div className="sidebar-block__label">
              <span>自选股</span>
              <MaterialIcon className="icon-button__icon" filled name="add_circle" />
            </div>
            <div className="sidebar-watchlist">
              {WATCHLIST.map((item) => (
                <a
                  key={item.symbol}
                  className={item.active ? 'sidebar-watchlist__item is-active' : 'sidebar-watchlist__item'}
                  href={links.home}
                >
                  <strong>{item.symbol}</strong>
                  <span>{formatCurrency(item.price)}</span>
                </a>
              ))}
            </div>
          </div>

          <div className="sidebar-block">
            <div className="sidebar-block__label">历史计划</div>
            <div className="sidebar-history-list">
              {HISTORY_PLANS.map((item) => (
                <div key={item.name} className={item.active ? 'sidebar-history-list__item is-active' : 'sidebar-history-list__item'}>
                  <strong>{item.name}</strong>
                  <span>{item.note}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="sidebar-footer">
            <a className="button-primary button-full" href={links.accumNew}>
              <MaterialIcon className="icon-button__icon" name="add" />
              新建仓计划
            </a>
            <div className="sidebar-block">
              <a className="sidebar-foot-link" href={links.catalog}>
                <span>页面目录</span>
                <MaterialIcon className="icon-button__icon" name="menu" />
              </a>
              <a className="sidebar-foot-link" href={links.history}>
                <span>风险披露</span>
                <MaterialIcon className="icon-button__icon" name="warning" />
              </a>
            </div>
          </div>
        </>
      }
    >
      <section className="page-header">
        <div>
          <div className="page-header__split">
            <div>
              <h1 className="page-title">QQQ 建仓策略</h1>
              <p className="page-subtitle">纳斯达克100指数基金 (QQQ)</p>
            </div>
            <StatusBadge>运行中</StatusBadge>
          </div>
        </div>
        <div className="page-header__actions">
          <a className="button-secondary" href={links.accumEdit}>
            <MaterialIcon className="icon-button__icon" name="edit" />
            修改配置
          </a>
          <button className="button-danger" type="button">
            <MaterialIcon className="icon-button__icon" name="delete" />
            删除
          </button>
        </div>
      </section>

      <section className="metric-grid">
        <MetricCard
          accent="primary"
          label="总投资额"
          note="当前金字塔策略总预算"
          progress={Math.max(100 - reserveRatio, 0)}
          value={formatCurrency(accumulation.investedCapital)}
        />
        <MetricCard label="剩余预算" note={`${formatPercent(reserveRatio, 1)} 可用资金`} value={formatCurrency(plan.reserveCapital)} />
        <MetricCard label="下次买入价" note="等待价格触发信号" value={formatCurrency(nextBuyPrice)} />
        <MetricCard label="平均成本" note={`${formatPercent(4.2, 1, true)} 增长`} value={formatCurrency(accumulation.averageCost)} />
      </section>

      <section className="content-split">
        <SurfaceCard>
          <div className="section-header">
            <div>
              <div className="section-eyebrow">价格走势与买点位</div>
              <h2 className="section-title">价格走势与买点位</h2>
            </div>
            <div className="range-switch">
              <span>1D</span>
              <span className="is-active">1W</span>
              <span>1M</span>
            </div>
          </div>
          <div className="chart-panel">
            <div className="fake-chart">
              <div className="fake-chart__line">
                <svg preserveAspectRatio="none" viewBox="0 0 100 100">
                  <polyline fill="none" points="0,70 10,68 18,74 28,62 36,58 46,42 58,49 66,34 76,26 84,20 92,12 100,4" stroke="currentColor" strokeWidth="2.2" />
                </svg>
              </div>
              <div className="fake-chart__line--secondary">
                <svg preserveAspectRatio="none" viewBox="0 0 100 100">
                  <polyline fill="none" points="0,76 12,70 22,72 34,67 44,63 56,58 66,53 78,49 90,45 100,40" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
              <div className="fake-chart__line--tertiary">
                <svg preserveAspectRatio="none" viewBox="0 0 100 100">
                  <polyline fill="none" points="0,90 12,88 22,84 34,80 44,69 54,57 66,44 76,33 88,18 100,7" stroke="currentColor" strokeWidth="2.6" />
                </svg>
              </div>
              <div className="fake-chart__bars">
                <svg preserveAspectRatio="none" viewBox="0 0 100 100">
                  <rect fill="currentColor" height="32" width="2.5" x="3" y="68" />
                  <rect fill="currentColor" height="42" width="2.5" x="9" y="58" />
                  <rect fill="currentColor" height="26" width="2.5" x="15" y="74" />
                  <rect fill="currentColor" height="54" width="2.5" x="21" y="46" />
                  <rect fill="currentColor" height="48" width="2.5" x="27" y="52" />
                  <rect fill="currentColor" height="66" width="2.5" x="33" y="34" />
                  <rect fill="currentColor" height="39" width="2.5" x="39" y="61" />
                  <rect fill="currentColor" height="58" width="2.5" x="45" y="42" />
                  <rect fill="currentColor" height="44" width="2.5" x="51" y="56" />
                  <rect fill="currentColor" height="70" width="2.5" x="57" y="30" />
                  <rect fill="currentColor" height="48" width="2.5" x="63" y="52" />
                  <rect fill="currentColor" height="64" width="2.5" x="69" y="36" />
                  <rect fill="currentColor" height="74" width="2.5" x="75" y="26" />
                  <rect fill="currentColor" height="52" width="2.5" x="81" y="48" />
                  <rect fill="currentColor" height="68" width="2.5" x="87" y="32" />
                  <rect fill="currentColor" height="80" width="2.5" x="93" y="20" />
                </svg>
              </div>
              <div className="fake-chart__marker fake-chart__marker--buy-a">触发买入A</div>
              <div className="fake-chart__marker fake-chart__marker--buy-b">触发买入B</div>
            </div>

            <div className="stage-chip-row">
              {accumulation.stages.slice(0, 3).map((stage, index) => (
                <div key={stage.id} className={index === 1 ? 'stage-chip is-active' : 'stage-chip'}>
                  <div className="stage-chip__label">阶段 {index + 1}</div>
                  <div className="stage-chip__value">{formatCurrency(stage.price)}</div>
                  <div className="stage-chip__meta">{index === 0 ? '执行完成' : index === 1 ? '即将触发' : '待命'}</div>
                </div>
              ))}
            </div>
          </div>
        </SurfaceCard>

        <div className="card-grid">
          <SurfaceCard className="surface-card--tight">
            <div className="section-header">
              <div>
                <div className="section-eyebrow">建仓计划详情</div>
                <h2 className="section-title">建仓计划详情</h2>
              </div>
            </div>
            <table className="plan-table">
              <thead>
                <tr>
                  <th>阶段</th>
                  <th>价格</th>
                  <th>跌幅</th>
                  <th>金额</th>
                </tr>
              </thead>
              <tbody>
                {accumulation.stages.map((stage, index) => (
                  <tr key={stage.id}>
                    <td>{String(index + 1).padStart(2, '0')}</td>
                    <td>{formatCurrency(stage.price)}</td>
                    <td>{index === 0 ? '基准' : formatPercent(stage.drawdown, 1)}</td>
                    <td>{formatCurrency(stage.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SurfaceCard>

          <SurfaceCard className="surface-card--tight">
            <div className="section-header">
              <div>
                <div className="section-eyebrow">资金配置模型</div>
                <h2 className="section-title">资金配置模型</h2>
              </div>
            </div>
            <div className="weight-stack">
              <div className="weight-stack__bars">
                {accumulation.stages.map((stage, index) => (
                  <div
                    key={stage.id}
                    className={index < accumulation.stages.length - 1 ? 'weight-stack__bar is-muted' : 'weight-stack__bar'}
                    style={{ height: `${Math.max(stage.weightPercent * 2.4, 28)}px` }}
                  >
                    {formatPercent(stage.weightPercent, 0)}
                  </div>
                ))}
              </div>
              <div className="table-note">分配权重与目标跌幅同步驱动入场价格，末层最大跌幅 {formatPercent(accumulationState.maxDrawdown, 2)}。</div>
            </div>
          </SurfaceCard>

          <SurfaceCard className="surface-card--tight">
            <div className="section-header">
              <div>
                <div className="section-eyebrow">操作说明</div>
                <h2 className="section-title">执行建议</h2>
              </div>
            </div>
            <ul className="list-note">
              <li>首笔建仓使用 {formatCurrency(accumulation.stages[0]?.price ?? accumulationState.basePrice)} 作为基准价。</li>
              <li>下一层计划买入价为 {formatCurrency(nextBuyPrice)}，触发后自动重算平均成本。</li>
              <li>定投计划当前总投入 {formatCurrency(dca.totalInvestment)}，执行频率为 {dcaState.frequency}。</li>
            </ul>
          </SurfaceCard>
        </div>
      </section>
    </WorkspaceShell>
  );
}
