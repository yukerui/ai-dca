import { useMemo, useState } from 'react';
import { buildStages, formatCurrency, formatPercent, persistAccumulationState, readAccumulationState, round } from '../app/accumulation.js';
import { createTopTabs } from '../app/screens.js';
import { NumberField } from '../components/FormFields.jsx';
import { AppShell } from '../components/AppShell.jsx';
import { StatCard } from '../components/StatCard.jsx';

export function AddLevelExperience({ screen, links, inPagesDir }) {
  const [baseState, setBaseState] = useState(() => readAccumulationState());
  const [newWeight, setNewWeight] = useState(18);
  const [newDrawdown, setNewDrawdown] = useState(round(baseState.maxDrawdown + 4, 2));
  const [saved, setSaved] = useState(false);
  const tabs = createTopTabs({ inPagesDir });

  const previewState = useMemo(() => ({
    ...baseState,
    weights: [...baseState.weights, Math.max(Number(newWeight) || 0, 0)],
    maxDrawdown: Math.max(Number(newDrawdown) || 0, 0)
  }), [baseState, newWeight, newDrawdown]);

  const preview = useMemo(() => buildStages(previewState), [previewState]);

  function handleApply() {
    const nextState = {
      ...baseState,
      weights: [...baseState.weights, Math.max(Number(newWeight) || 0, 0)],
      maxDrawdown: Math.max(Number(newDrawdown) || 0, 0)
    };
    const computed = buildStages(nextState);
    persistAccumulationState(nextState, computed);
    setBaseState(nextState);
    setSaved(true);
    setNewWeight(12);
    setNewDrawdown(round(nextState.maxDrawdown + 4, 2));
  }

  return (
    <AppShell
      activeTab="accumEdit"
      tabs={tabs}
      sideNav={{
        title: '加仓模块',
        subtitle: '新增层级预览',
        items: [
          { label: '策略总览', icon: '▣', href: links.home },
          { label: '加仓配置', icon: '◉', href: links.accumEdit },
          { label: '新增层级', icon: '+', href: links.addLevel, active: true },
          { label: '交易历史', icon: '↺', href: links.history },
          { label: '页面目录', icon: '☰', href: links.catalog }
        ],
        footer: <a className="side-nav__cta" href={links.accumEdit}>返回加仓配置</a>
      }}
      headerMeta={[
        { label: '标的', value: baseState.symbol },
        { label: '现有层级', value: `${baseState.weights.length} 层` },
        { label: '预览层级', value: `${preview.stages.length} 层` }
      ]}
      screen={screen}
    >
      <section className="page-section page-section--hero">
        <div>
          <div className="page-eyebrow">新增加仓层级</div>
          <h1 className="page-title">{screen.title}</h1>
          <p className="page-copy">为当前金字塔加仓模型追加一个新层级。应用后会直接写回共享的加仓配置状态，返回加仓页就能看到新增层级。</p>
        </div>
        <div className="hero-grid">
          <StatCard label="预览层级数" value={`${preview.stages.length} 层`} note={`当前 ${baseState.weights.length} 层`} tone="primary" />
          <StatCard label="预览末层跌幅" value={formatPercent(previewState.maxDrawdown, 2)} note="新增层级会成为新的最深层" />
          <StatCard label="预估平均成本" value={formatCurrency(preview.averageCost)} note={`总预算仍为 ${formatCurrency(baseState.totalCapital)}`} />
        </div>
      </section>

      <div className="content-grid">
        <section className="panel">
          <div className="panel__header">
            <div>
              <div className="panel__eyebrow">新增参数</div>
              <h2 className="panel__title">层级配置</h2>
            </div>
          </div>
          <div className="field-grid">
            <NumberField label="新增层级权重" suffix="%" step="1" value={newWeight} onChange={(event) => setNewWeight(Number(event.target.value) || 0)} />
            <NumberField label="新增层级最大跌幅" suffix="%" step="0.5" value={newDrawdown} onChange={(event) => setNewDrawdown(Number(event.target.value) || 0)} helper="新增层级会拉高整个模型的末层跌幅。" />
          </div>
          <div className="button-row button-row--panel">
            <button className="primary-button" type="button" onClick={handleApply}>应用到加仓配置</button>
            <a className="ghost-button" href={links.accumEdit}>返回加仓配置</a>
          </div>
          {saved ? <div className="panel__footer-text">已保存。返回加仓配置页即可看到新增层级。</div> : null}
        </section>

        <section className="panel panel--table">
          <div className="panel__header">
            <div>
              <div className="panel__eyebrow">预览结果</div>
              <h2 className="panel__title">新增后的层级明细</h2>
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
              {preview.stages.map((stage, index) => (
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
    </AppShell>
  );
}
