import { useEffect, useMemo, useState } from 'react';
import { formatCurrency, formatPercent } from '../app/accumulation.js';
import { buildPlan, persistPlanState, readPlanState } from '../app/plan.js';
import { NumberField, SelectField, TextField } from '../components/FormFields.jsx';
import { MaterialIcon } from '../components/MaterialIcon.jsx';
import { MinimalShell, SurfaceCard } from '../components/PageChrome.jsx';

const frequencyOptions = ['每日', '每周', '每月', '每季'];

export function NewPlanExperience({ screen, links }) {
  const [state, setState] = useState(() => readPlanState());
  const computed = useMemo(() => buildPlan(state), [state]);

  useEffect(() => {
    persistPlanState(state, computed);
  }, [state, computed]);

  return (
    <MinimalShell
      title="投资计划"
      headerRight={
        <>
          <button className="icon-button" type="button">
            <MaterialIcon className="icon-button__icon" name="settings" />
          </button>
          <button className="icon-button" type="button">
            <MaterialIcon className="icon-button__icon" name="account_circle" />
          </button>
        </>
      }
    >
      <section className="page-header">
        <div>
          <h1 className="page-title page-title--compact">{screen.title}</h1>
          <p className="page-subtitle">设置您的金字塔建仓策略，通过分批买入降低持仓风险。</p>
        </div>
      </section>

      <section className="minimal-layout">
        <div>
          <SurfaceCard>
            <div className="section-header">
              <div>
                <div className="section-eyebrow">基础设置</div>
                <h2 className="section-title">基础设置</h2>
              </div>
              <div className="section-step">Step 01</div>
            </div>

            <div className="field-grid">
              <TextField
                label="资产标的"
                value={state.symbol}
                onChange={(event) => setState((current) => ({ ...current, symbol: event.target.value || 'QQQ' }))}
                placeholder="输入股票代码或简称 (如: AAPL)"
              />
              <div className="field-grid field-grid--2">
                <NumberField
                  label="总投资额"
                  prefix="$"
                  value={state.totalBudget}
                  onChange={(event) => setState((current) => ({ ...current, totalBudget: Number(event.target.value) || 0 }))}
                />
                <label className="field">
                  <span className="field__label">
                    <span>现金留存比例</span>
                    <span>{formatPercent(state.cashReservePct, 0)}</span>
                  </span>
                  <div className="field__input-shell">
                    <div className="inline-slider">
                      <input
                        max="90"
                        min="0"
                        step="1"
                        type="range"
                        value={state.cashReservePct}
                        onChange={(event) => setState((current) => ({ ...current, cashReservePct: Number(event.target.value) || 0 }))}
                      />
                    </div>
                  </div>
                  <span className="field__helper">默认 30%，建仓总预算 = 总投资额 × (1 - 现金留存比例)</span>
                </label>
              </div>
              <div className="field-grid field-grid--2">
                <NumberField
                  label="首笔价格"
                  prefix="$"
                  value={state.basePrice}
                  onChange={(event) => setState((current) => ({ ...current, basePrice: Number(event.target.value) || 0 }))}
                />
                <SelectField
                  label="执行频率"
                  value={state.frequency}
                  onChange={(event) => setState((current) => ({ ...current, frequency: event.target.value }))}
                  options={frequencyOptions}
                />
              </div>
            </div>

            <div className="budget-strip">
              <div>
                <div className="section-eyebrow">计划建仓总预算</div>
                <div className="table-note">扣除预留现金后的可执行预算</div>
              </div>
              <div className="budget-strip__value">{formatCurrency(computed.investableCapital, '¥ ')}</div>
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <div className="section-header">
              <div>
                <div className="section-eyebrow">分批建仓设置</div>
                <h2 className="section-title">分批建仓设置</h2>
              </div>
              <div className="section-step">Step 02</div>
            </div>
            <div className="table-note" style={{ marginBottom: 16 }}>按现金比例自动计算每笔投入金额</div>

            <div className="step-list">
              {computed.layers.map((layer, index) => (
                <div key={layer.id} className="step-row">
                  <div className="step-row__head">
                    <div className={index === 0 ? 'step-badge is-active' : 'step-badge'}>{index + 1}</div>
                    <div className="step-row__title">{index === 0 ? '首笔买入' : `第 ${index + 1} 笔买入`}</div>
                  </div>
                  <div className="step-row__fields">
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
                  </div>
                  <div className="stage-row__meta">
                    <span>入场价格 {formatCurrency(layer.price)}</span>
                    <strong>计划投入 {formatCurrency(layer.amount)}</strong>
                  </div>
                </div>
              ))}
            </div>
          </SurfaceCard>

          <div className="minimal-actions">
            <a className="button-secondary" href={links.home}>取消</a>
            <a className="button-primary" href={links.home}>确认创建</a>
          </div>
        </div>

        <div className="minimal-layout__aside">
          <SurfaceCard className="surface-card--tight">
            <div className="section-eyebrow">策略成本预览</div>
            <div className="summary-tile__value">{formatCurrency(computed.averageCost, '¥ ')}</div>
            <div className="summary-lines">
              <div className="summary-lines__row">
                <span>可投入资金</span>
                <strong>{formatCurrency(computed.investableCapital, '¥ ')}</strong>
              </div>
              <div className="summary-lines__row">
                <span>预留现金</span>
                <strong>{formatCurrency(computed.reserveCapital, '¥ ')}</strong>
              </div>
            </div>
            <div className="bar-preview">
              {computed.layers.map((layer) => (
                <span key={layer.id} style={{ height: `${Math.max(layer.weight / 1.8, 22)}px` }} />
              ))}
            </div>
          </SurfaceCard>

          <div className="info-card">
            <div className="info-card__title">
              <MaterialIcon className="icon-button__icon" filled name="check_circle" />
              执行建议
            </div>
            <p className="info-card__text">
              将计划分为 {computed.layers.length} 批执行，留存现金 {formatPercent(state.cashReservePct, 0)}。后续加仓页会沿用这些分配比例。
            </p>
          </div>

          <div className="warning-card">
            <div className="warning-card__title">
              <MaterialIcon className="icon-button__icon" filled name="tips_and_updates" />
              估计备注
            </div>
            <p className="warning-card__text">
              平均成本和批次金额会随分配比例、触发跌幅和首笔价格自动联动更新。
            </p>
          </div>
        </div>
      </section>
    </MinimalShell>
  );
}
