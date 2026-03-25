import { useMemo, useState } from 'react';
import { buildStages, formatCurrency, formatPercent, persistAccumulationState, readAccumulationState, round } from '../app/accumulation.js';
import { NumberField } from '../components/FormFields.jsx';
import { MaterialIcon } from '../components/MaterialIcon.jsx';
import { MinimalShell, SurfaceCard } from '../components/PageChrome.jsx';

export function AddLevelExperience({ screen, links }) {
  const [baseState, setBaseState] = useState(() => readAccumulationState());
  const [newWeight, setNewWeight] = useState(5);
  const [newDrawdown, setNewDrawdown] = useState(round(baseState.maxDrawdown + 1.5, 2));
  const [saved, setSaved] = useState(false);

  const previewState = useMemo(() => ({
    ...baseState,
    weights: [...baseState.weights, Math.max(Number(newWeight) || 0, 0)],
    maxDrawdown: Math.max(Number(newDrawdown) || 0, 0)
  }), [baseState, newWeight, newDrawdown]);

  const preview = useMemo(() => buildStages(previewState), [previewState]);
  const addedStage = preview.stages[preview.stages.length - 1];

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
    setNewWeight(5);
    setNewDrawdown(round(nextState.maxDrawdown + 1.5, 2));
  }

  return (
    <MinimalShell
      title="Axiom Trade"
      headerRight={
        <>
          <button className="icon-button" type="button">
            <MaterialIcon className="icon-button__icon" name="notifications" />
          </button>
          <div className="avatar">AT</div>
        </>
      }
    >
      <section className="page-header">
        <div>
          <div className="page-breadcrumb">
            <MaterialIcon className="icon-button__icon" name="arrow_back" />
            <span>返回加仓仓位配置</span>
          </div>
          <h1 className="page-title page-title--compact">{screen.title}</h1>
          <p className="page-subtitle">为您的金字塔建仓模型追加新的层级，系统会实时计算新增层级带来的资金占用和目标价格变化。</p>
        </div>
      </section>

      <section className="minimal-layout">
        <div>
          <SurfaceCard>
            <div className="section-header">
              <div>
                <div className="section-eyebrow">层级参数设置</div>
                <h2 className="section-title">层级参数设置</h2>
              </div>
            </div>

            <div className="field-grid field-grid--2">
              <NumberField
                label="新增权重 (%)"
                step="1"
                value={newWeight}
                onChange={(event) => setNewWeight(Number(event.target.value) || 0)}
                helper="将参与总权重重新分配。"
              />
              <NumberField
                label="最大跌幅 (%)"
                step="0.5"
                value={newDrawdown}
                onChange={(event) => setNewDrawdown(Number(event.target.value) || 0)}
                helper="新增层级将成为新的最深层。"
              />
            </div>

            <div className="budget-strip">
              <div>
                <div className="section-eyebrow">预估追加资金</div>
                <div className="table-note">根据总预算和新增权重自动计算</div>
              </div>
              <div className="budget-strip__value">{formatCurrency(addedStage?.amount ?? 0, '¥ ')}</div>
            </div>

            <div className="minimal-actions">
              <button className="button-primary button-full" type="button" onClick={handleApply}>
                保存并增加层级
              </button>
              <a className="button-secondary" href={links.accumEdit}>取消</a>
            </div>

            {saved ? <div className="table-note">已保存。返回加仓配置页即可看到新增层级。</div> : null}
          </SurfaceCard>
        </div>

        <div className="minimal-layout__aside">
          <SurfaceCard className="surface-card--tight">
            <div className="section-eyebrow">新增预览</div>
            <div className="bar-preview">
              {preview.stages.map((stage, index) => (
                <span key={stage.id} style={{ height: `${32 + index * 16}px` }} />
              ))}
            </div>
            <div className="summary-lines">
              <div className="summary-lines__row">
                <span>追加预算占比</span>
                <strong>{formatPercent(addedStage?.weightPercent ?? 0, 1)}</strong>
              </div>
              <div className="summary-lines__row">
                <span>大盘预计跌幅</span>
                <strong>{formatPercent(previewState.maxDrawdown, 2)}</strong>
              </div>
              <div className="summary-lines__row">
                <span>预估平均成本</span>
                <strong>{formatCurrency(preview.averageCost, '¥ ')}</strong>
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard className="surface-card--tight">
            <div className="summary-list">
              <div className="summary-list__row">
                <span>计划追加金额</span>
                <strong>{formatCurrency(addedStage?.amount ?? 0, '¥ ')}</strong>
              </div>
              <div className="summary-list__row">
                <span>本次预留现金变化</span>
                <strong>{formatCurrency(baseState.totalCapital - preview.investedCapital, '¥ ')}</strong>
              </div>
              <div className="summary-list__row">
                <span>剩余预留现金</span>
                <strong>{formatCurrency(Math.max(baseState.totalCapital - preview.investedCapital, 0), '¥ ')}</strong>
              </div>
            </div>
          </SurfaceCard>

          <div className="decorative-panel" />
        </div>
      </section>

      <div className="note-card">
        <MaterialIcon className="icon-button__icon" name="warning" />
        <span>
          风险提示：新增层级会改变整体累计跌幅分布。若市场发生快速波动，请复核最大跌幅和剩余现金缓冲，以免过早耗尽预留资金。
        </span>
      </div>
    </MinimalShell>
  );
}
