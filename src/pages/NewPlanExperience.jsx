import { useEffect, useMemo, useState } from 'react';
import { formatCurrency, formatPercent } from '../app/accumulation.js';
import { buildPlan, persistPlanState, readPlanState } from '../app/plan.js';
import { createTopTabs } from '../app/screens.js';
import { NumberField, SelectField, TextField } from '../components/FormFields.jsx';
import { AppShell } from '../components/AppShell.jsx';
import { StatCard } from '../components/StatCard.jsx';

const frequencyOptions = ['每日', '每周', '每月', '每季'];

export function NewPlanExperience({ screen, links, inPagesDir }) {
  const [state, setState] = useState(() => readPlanState());
  const computed = useMemo(() => buildPlan(state), [state]);
  const tabs = createTopTabs({ inPagesDir });

  useEffect(() => {
    persistPlanState(state, computed);
  }, [state, computed]);

  return (
    <AppShell
      activeTab="home"
      tabs={tabs}
      sideNav={{
        title: '建仓模块',
        subtitle: '预算与现金配置',
        items: [
          { label: '策略总览', icon: '▣', href: links.home },
          { label: '初始建仓', icon: '◎', href: links.accumNew, active: true },
          { label: '加仓配置', icon: '◉', href: links.accumEdit },
          { label: '定投计划', icon: '◌', href: links.dca },
          { label: '页面目录', icon: '☰', href: links.catalog }
        ],
        footer: <a className="side-nav__cta" href={links.home}>返回封面</a>
      }}
      headerMeta={[
        { label: '标的', value: state.symbol },
        { label: '现金留存', value: formatPercent(state.cashReservePct, 0) },
        { label: '批次数', value: `${computed.layers.length} 批` }
      ]}
      screen={screen}
    >
      <section className="page-section page-section--hero">
        <div>
          <div className="page-eyebrow">初始建仓配置</div>
          <h1 className="page-title">{screen.title}</h1>
          <p className="page-copy">建仓总预算按“总预算 × (1 - 现金留存比例)”计算。每批的触发跌幅和分配比例会同步得到入场价格和预估平均成本。</p>
        </div>
        <div className="hero-grid">
          <StatCard label="总预算" value={formatCurrency(state.totalBudget)} note="账户总资金规模" tone="primary" />
          <StatCard label="可投入资金" value={formatCurrency(computed.investableCapital)} note={`留存现金 ${formatCurrency(computed.reserveCapital)}`} />
          <StatCard label="预估平均成本" value={formatCurrency(computed.averageCost)} note={`共 ${computed.layers.length} 批执行`} />
        </div>
      </section>

      <div className="content-grid">
        <section className="panel">
          <div className="panel__header">
            <div>
              <div className="panel__eyebrow">预算设置</div>
              <h2 className="panel__title">计划基础参数</h2>
            </div>
          </div>
          <div className="field-grid">
            <TextField label="标的代码" value={state.symbol} onChange={(event) => setState((current) => ({ ...current, symbol: event.target.value || 'QQQ' }))} />
            <NumberField label="总预算" prefix="$" value={state.totalBudget} onChange={(event) => setState((current) => ({ ...current, totalBudget: Number(event.target.value) || 0 }))} />
            <NumberField label="现金留存比例" suffix="%" value={state.cashReservePct} onChange={(event) => setState((current) => ({ ...current, cashReservePct: Number(event.target.value) || 0 }))} />
            <NumberField label="首笔价格" prefix="$" value={state.basePrice} onChange={(event) => setState((current) => ({ ...current, basePrice: Number(event.target.value) || 0 }))} />
            <SelectField label="执行频率" value={state.frequency} onChange={(event) => setState((current) => ({ ...current, frequency: event.target.value }))} options={frequencyOptions} />
          </div>
        </section>

        <section className="panel">
          <div className="panel__header">
            <div>
              <div className="panel__eyebrow">建仓批次</div>
              <h2 className="panel__title">分批预算与触发条件</h2>
            </div>
          </div>
          <div className="stage-list">
            {computed.layers.map((layer, index) => (
              <article key={layer.id} className={index === 0 ? 'stage-card is-primary' : 'stage-card'}>
                <div className="stage-card__index">{String(index + 1).padStart(2, '0')}</div>
                <div className="stage-card__fields">
                  <NumberField
                    label="分配比例"
                    suffix="%"
                    step="1"
                    value={state.layerWeights[index] ?? 0}
                    onChange={(event) => {
                      const next = [...state.layerWeights];
                      next[index] = Number(event.target.value) || 0;
                      setState((current) => ({ ...current, layerWeights: next }));
                    }}
                  />
                  <NumberField
                    label="触发跌幅"
                    suffix="%"
                    step="0.5"
                    value={state.triggerDrops[index] ?? 0}
                    onChange={(event) => {
                      const next = [...state.triggerDrops];
                      next[index] = Number(event.target.value) || 0;
                      setState((current) => ({ ...current, triggerDrops: next }));
                    }}
                  />
                  <NumberField label="计划投入" prefix="$" value={layer.amount.toFixed(2)} readOnly onChange={() => {}} />
                </div>
                <div className="stage-card__meta">
                  <span>入场价格 {formatCurrency(layer.price)}</span>
                  <strong>{formatCurrency(layer.shares, '', 3)} 股</strong>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="panel panel--table">
        <div className="panel__header">
          <div>
            <div className="panel__eyebrow">建仓摘要</div>
            <h2 className="panel__title">预算分配明细</h2>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>批次</th>
              <th>分配比例</th>
              <th>触发跌幅</th>
              <th>入场价格</th>
              <th>计划投入</th>
            </tr>
          </thead>
          <tbody>
            {computed.layers.map((layer) => (
              <tr key={layer.id}>
                <td>{layer.label}</td>
                <td>{formatPercent(layer.weight, 1)}</td>
                <td>{formatPercent(layer.drawdown, 1)}</td>
                <td>{formatCurrency(layer.price)}</td>
                <td>{formatCurrency(layer.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
