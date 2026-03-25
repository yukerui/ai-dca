import { useEffect, useMemo, useState } from 'react';
import { formatCurrency, formatPercent } from '../app/accumulation.js';
import { buildDcaProjection, frequencyOptions, persistDcaState, readDcaState } from '../app/dca.js';
import { createTopTabs } from '../app/screens.js';
import { NumberField, SelectField, TextField } from '../components/FormFields.jsx';
import { AppShell } from '../components/AppShell.jsx';
import { StatCard } from '../components/StatCard.jsx';

export function DcaExperience({ screen, links, inPagesDir }) {
  const [state, setState] = useState(() => readDcaState());
  const projection = useMemo(() => buildDcaProjection(state), [state]);
  const tabs = createTopTabs({ inPagesDir });

  useEffect(() => {
    persistDcaState(state, projection);
  }, [state, projection]);

  return (
    <AppShell
      activeTab="dca"
      tabs={tabs}
      sideNav={{
        title: '定投模块',
        subtitle: '长期摊薄成本',
        items: [
          { label: '策略总览', icon: '▣', href: links.home },
          { label: '定投计划', icon: '◌', href: links.dca, active: true },
          { label: '加仓配置', icon: '◉', href: links.accumEdit },
          { label: '交易历史', icon: '↺', href: links.history },
          { label: '页面目录', icon: '☰', href: links.catalog }
        ],
        footer: <a className="side-nav__cta" href={links.home}>返回封面</a>
      }}
      headerMeta={[
        { label: '标的', value: state.symbol },
        { label: '频率', value: state.frequency },
        { label: '目标收益', value: formatPercent(state.targetReturn, 0) }
      ]}
      screen={screen}
    >
      <section className="page-section page-section--hero">
        <div>
          <div className="page-eyebrow">定投计划配置</div>
          <h1 className="page-title">{screen.title}</h1>
          <p className="page-copy">总投入按“初始投资额 + 定期投资额 × 执行次数”计算。执行次数由频率和投资周期推导，便于快速对比不同节奏下的资金曲线。</p>
        </div>
        <div className="hero-grid">
          <StatCard label="总投入" value={formatCurrency(projection.totalInvestment)} note={projection.cadenceLabel} tone="primary" />
          <StatCard label="执行次数" value={`${projection.executionCount} 次`} note={`周期 ${state.termMonths} 个月`} />
          <StatCard label="月均投入" value={formatCurrency(projection.monthlyEquivalent)} note={`目标收益 ${formatPercent(state.targetReturn, 0)}`} />
        </div>
      </section>

      <div className="content-grid">
        <section className="panel">
          <div className="panel__header">
            <div>
              <div className="panel__eyebrow">基本参数</div>
              <h2 className="panel__title">定投设置</h2>
            </div>
          </div>
          <div className="field-grid">
            <TextField label="标的代码" value={state.symbol} onChange={(event) => setState((current) => ({ ...current, symbol: event.target.value || 'QQQ' }))} />
            <NumberField label="初始投资额" prefix="$" value={state.initialInvestment} onChange={(event) => setState((current) => ({ ...current, initialInvestment: Number(event.target.value) || 0 }))} />
            <NumberField label="定期投资额" prefix="$" value={state.recurringInvestment} onChange={(event) => setState((current) => ({ ...current, recurringInvestment: Number(event.target.value) || 0 }))} />
            <SelectField label="买入频率" value={state.frequency} onChange={(event) => setState((current) => ({ ...current, frequency: event.target.value }))} options={frequencyOptions} />
            <NumberField label="执行日期 / 序号" value={state.executionDay} step="1" onChange={(event) => setState((current) => ({ ...current, executionDay: Number(event.target.value) || 1 }))} />
            <NumberField label="投资周期(月)" value={state.termMonths} step="1" onChange={(event) => setState((current) => ({ ...current, termMonths: Number(event.target.value) || 1 }))} />
            <NumberField label="目标收益" suffix="%" value={state.targetReturn} step="1" onChange={(event) => setState((current) => ({ ...current, targetReturn: Number(event.target.value) || 0 }))} helper="第一阶段先做规则占位，不做复杂回测模拟。" />
          </div>
        </section>

        <section className="panel">
          <div className="panel__header">
            <div>
              <div className="panel__eyebrow">执行序列</div>
              <h2 className="panel__title">前六次定投预览</h2>
            </div>
          </div>
          <div className="schedule-list">
            {projection.schedule.map((row) => (
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
      </div>

      <section className="panel panel--table">
        <div className="panel__header">
          <div>
            <div className="panel__eyebrow">执行摘要</div>
            <h2 className="panel__title">定投参数汇总</h2>
          </div>
        </div>
        <table className="data-table">
          <tbody>
            <tr>
              <th>初始投资额</th>
              <td>{formatCurrency(state.initialInvestment)}</td>
              <th>定期投资额</th>
              <td>{formatCurrency(state.recurringInvestment)}</td>
            </tr>
            <tr>
              <th>买入频率</th>
              <td>{state.frequency}</td>
              <th>执行次数</th>
              <td>{projection.executionCount} 次</td>
            </tr>
            <tr>
              <th>投资周期</th>
              <td>{state.termMonths} 个月</td>
              <th>总投入</th>
              <td>{formatCurrency(projection.totalInvestment)}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
