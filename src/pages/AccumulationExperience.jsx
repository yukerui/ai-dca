import { useEffect, useMemo, useState } from 'react';
import { buildStages, formatCurrency, formatPercent, persistAccumulationState, readAccumulationState, round } from '../app/accumulation.js';
import { createTopTabs } from '../app/screens.js';
import { NumberField, SelectField } from '../components/FormFields.jsx';
import { AppShell } from '../components/AppShell.jsx';
import { StatCard } from '../components/StatCard.jsx';

const frequencyOptions = ['每日', '每周', '每月', '每季'];

export function AccumulationExperience({ screen, links, inPagesDir }) {
  const [state, setState] = useState(() => readAccumulationState());
  const computed = useMemo(() => buildStages(state), [state]);
  const tabs = createTopTabs({ inPagesDir });
  const nextBuyPrice = computed.stages[1]?.price ?? computed.stages[0]?.price ?? state.basePrice;
  const riskNote = computed.stages.length > 2
    ? `末层最大跌幅 ${formatPercent(state.maxDrawdown, 2)}，权重变化会自动重算每层入场价格。`
    : '建议至少保留三层加仓，避免过早打满仓位。';

  useEffect(() => {
    persistAccumulationState(state, computed);
  }, [state, computed]);

  return (
    <AppShell
      activeTab="accumEdit"
      tabs={tabs}
      sideNav={{
        title: '加仓模块',
        subtitle: '权重联动模型',
        items: [
          { label: '策略总览', icon: '▣', href: links.home },
          { label: '加仓配置', icon: '◉', href: links.accumEdit, active: true },
          { label: '新增层级', icon: '+', href: links.addLevel },
          { label: '交易历史', icon: '↺', href: links.history },
          { label: '页面目录', icon: '☰', href: links.catalog }
        ],
        footer: <a className="side-nav__cta" href={links.addLevel}>新增层级</a>
      }}
      headerMeta={[
        { label: '标的', value: state.symbol },
        { label: '再平衡', value: state.frequency },
        { label: '末层跌幅', value: formatPercent(state.maxDrawdown, 2) }
      ]}
      screen={screen}
    >
      <section className="page-section page-section--hero">
        <div>
          <div className="page-eyebrow">加仓编辑页</div>
          <h1 className="page-title">{screen.title}</h1>
          <p className="page-copy">首笔价格作为基准价，后续层级会按照累计权重占比分配跌幅，并同步计算入场价格、计划金额和股数。</p>
        </div>
        <div className="hero-grid">
          <StatCard label="计划总预算" value={formatCurrency(state.totalCapital)} note="用于当前金字塔加仓模型" tone="primary" />
          <StatCard label="预估平均成本" value={formatCurrency(computed.averageCost)} note={`总权重 ${formatPercent(computed.totalWeight, 2)}`} />
          <StatCard label="下次买入价" value={formatCurrency(nextBuyPrice)} note={riskNote} />
        </div>
      </section>

      <div className="content-grid">
        <section className="panel">
          <div className="panel__header">
            <div>
              <div className="panel__eyebrow">基本参数</div>
              <h2 className="panel__title">全局设置</h2>
            </div>
          </div>
          <div className="field-grid">
            <NumberField label="初始投资额" prefix="$" value={state.totalCapital} onChange={(event) => setState((current) => ({ ...current, totalCapital: Number(event.target.value) || 0 }))} />
            <NumberField label="首笔价格" prefix="$" value={state.basePrice} onChange={(event) => setState((current) => ({ ...current, basePrice: Number(event.target.value) || 0 }))} />
            <NumberField label="末层最大跌幅" suffix="%" value={state.maxDrawdown} onChange={(event) => setState((current) => ({ ...current, maxDrawdown: Number(event.target.value) || 0 }))} helper="最后一层会吃满最大跌幅。" />
            <SelectField label="再平衡频率" value={state.frequency} onChange={(event) => setState((current) => ({ ...current, frequency: event.target.value }))} options={frequencyOptions} />
          </div>
          <div className="panel__footer-text">当前页面版本：{screen.title}</div>
        </section>

        <section className="panel">
          <div className="panel__header">
            <div>
              <div className="panel__eyebrow">目标跌幅加仓点</div>
              <h2 className="panel__title">权重联动入场价格</h2>
            </div>
            <div className="button-row">
              <a className="ghost-button" href={links.addLevel}>新增层级</a>
            </div>
          </div>
          <div className="stage-list">
            {computed.stages.map((stage, index) => (
              <article key={stage.id} className={index === 0 ? 'stage-card is-primary' : 'stage-card'}>
                <div className="stage-card__index">{String(index + 1).padStart(2, '0')}</div>
                <div className="stage-card__fields">
                  <NumberField
                    label="分配权重"
                    suffix="%"
                    step="1"
                    value={state.weights[index] ?? 0}
                    onChange={(event) => {
                      const nextWeights = [...state.weights];
                      nextWeights[index] = Number(event.target.value) || 0;
                      setState((current) => ({ ...current, weights: nextWeights }));
                    }}
                  />
                  <NumberField label="入场价格" prefix="$" value={round(stage.price, 2)} readOnly onChange={() => {}} />
                  <NumberField label="计划金额" prefix="$" value={round(stage.amount, 2)} readOnly onChange={() => {}} />
                </div>
                <div className="stage-card__meta">
                  <span>{index === 0 ? '首笔基准层' : `目标跌幅 ${formatPercent(stage.drawdown, 2)}`}</span>
                  <strong>{formatCurrency(stage.shares, '', 3)} 股</strong>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="panel panel--table">
        <div className="panel__header">
          <div>
            <div className="panel__eyebrow">执行摘要</div>
            <h2 className="panel__title">分层资金配置</h2>
          </div>
          <a className="ghost-button" href={links.history}>查看交易历史</a>
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
            {computed.stages.map((stage, index) => (
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
    </AppShell>
  );
}
