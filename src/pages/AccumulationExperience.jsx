import { useEffect, useMemo, useState } from 'react';
import { buildStages, formatCurrency, formatPercent, persistAccumulationState, readAccumulationState, round } from '../app/accumulation.js';
import { createTopTabs } from '../app/screens.js';
import { NumberField, SelectField } from '../components/FormFields.jsx';
import { MaterialIcon } from '../components/MaterialIcon.jsx';
import { StatusBadge, SurfaceCard, WorkspaceShell } from '../components/PageChrome.jsx';

const frequencyOptions = ['每日', '每周', '每月', '每季'];

export function AccumulationExperience({ screen, links, inPagesDir }) {
  const [state, setState] = useState(() => readAccumulationState());
  const computed = useMemo(() => buildStages(state), [state]);
  const tabs = createTopTabs({ inPagesDir });

  useEffect(() => {
    persistAccumulationState(state, computed);
  }, [state, computed]);

  return (
    <WorkspaceShell
      activeTab="accumEdit"
      tabs={tabs}
      headerRight={
        <>
          <button className="icon-button" type="button">
            <MaterialIcon className="icon-button__icon" name="light_mode" />
          </button>
          <button className="icon-button" type="button">
            <MaterialIcon className="icon-button__icon" name="notifications" />
          </button>
          <div className="avatar">AT</div>
        </>
      }
      sidebar={
        <>
          <div className="sidebar-brand-card">
            <div className="sidebar-brand-card__mark">
              <MaterialIcon filled name="query_stats" />
            </div>
            <div>
              <div className="sidebar-brand-card__title">策略编辑器</div>
              <div className="sidebar-brand-card__meta">金字塔增长</div>
            </div>
          </div>

          <div className="sidebar-menu">
            <a className="sidebar-menu__item is-active" href={links.accumEdit}>
              <MaterialIcon className="sidebar-menu__icon" filled name="layers" />
              <span>加仓配置</span>
            </a>
            <a className="sidebar-menu__item" href={links.history}>
              <MaterialIcon className="sidebar-menu__icon" name="insights" />
              <span>数据分析</span>
            </a>
            <a className="sidebar-menu__item" href={links.addLevel}>
              <MaterialIcon className="sidebar-menu__icon" name="add_chart" />
              <span>新增层级</span>
            </a>
          </div>
        </>
      }
    >
      <div className="page-breadcrumb">
        <a href={links.home}>策略列表</a>
        <MaterialIcon className="icon-button__icon" name="chevron_right" />
        <span>QQQ 建仓策略</span>
      </div>

      <section className="page-header">
        <div>
          <h1 className="page-title page-title--compact">修改策略配置 - QQQ</h1>
          <p className="page-subtitle">纳斯达克100指数ETF金字塔式建仓方案</p>
        </div>
        <StatusBadge>正在运行</StatusBadge>
      </section>

      <section className="content-split content-split--wide">
        <SurfaceCard>
          <div className="section-header">
            <div>
              <div className="section-eyebrow">基本参数设置</div>
              <h2 className="section-title">基本参数设置</h2>
            </div>
          </div>

          <div className="field-grid field-grid--2">
            <NumberField
              label="初始投资额"
              prefix="$"
              value={state.totalCapital}
              onChange={(event) => setState((current) => ({ ...current, totalCapital: Number(event.target.value) || 0 }))}
            />
            <NumberField
              label="首笔价格"
              prefix="$"
              value={state.basePrice}
              onChange={(event) => setState((current) => ({ ...current, basePrice: Number(event.target.value) || 0 }))}
            />
            <SelectField
              label="再平衡频率"
              value={state.frequency}
              onChange={(event) => setState((current) => ({ ...current, frequency: event.target.value }))}
              options={frequencyOptions}
              helper="系统将在预定时间检查价格并执行加仓动作。"
            />
            <NumberField
              label="末层最大跌幅"
              suffix="%"
              value={state.maxDrawdown}
              onChange={(event) => setState((current) => ({ ...current, maxDrawdown: Number(event.target.value) || 0 }))}
              helper="最后一层会吃满最大跌幅。"
            />
          </div>

          <div className="chart-panel" style={{ marginTop: 24 }}>
            <div className="fake-chart" style={{ height: 180 }}>
              <div className="fake-chart__line--tertiary">
                <svg preserveAspectRatio="none" viewBox="0 0 100 100">
                  <polyline fill="none" points="0,88 12,82 24,78 36,64 46,49 58,42 70,24 84,18 100,6" stroke="currentColor" strokeWidth="2.6" />
                </svg>
              </div>
            </div>
            <div className="table-note">历史回测预期年化: +12.4%</div>
          </div>
        </SurfaceCard>

        <div className="card-grid">
          <SurfaceCard>
            <div className="section-header">
              <div>
                <div className="section-eyebrow">目标跌幅加仓点</div>
                <h2 className="section-title">目标跌幅加仓点</h2>
              </div>
              <a className="button-secondary" href={links.addLevel}>
                <MaterialIcon className="icon-button__icon" name="add" />
                新增层级
              </a>
            </div>

            <div className="stage-list">
              {computed.stages.map((stage, index) => (
                <article key={stage.id} className="stage-row">
                  <div className={`stage-row__index stage-row__index--${index + 1}`}>{String(index + 1).padStart(2, '0')}</div>
                  <div className="stage-row__body">
                    <div className="stage-row__label">
                      {index === 0 ? '基准层级' : `目标跌幅 ${formatPercent(stage.drawdown, 2)}`}
                    </div>
                    <div className="stage-row__fields">
                      <NumberField
                        label="分配权重 (%)"
                        step="1"
                        value={state.weights[index] ?? 0}
                        onChange={(event) => {
                          const nextWeights = [...state.weights];
                          nextWeights[index] = Number(event.target.value) || 0;
                          setState((current) => ({ ...current, weights: nextWeights }));
                        }}
                      />
                      <NumberField label="入场价格 ($)" value={round(stage.price, 2)} readOnly onChange={() => {}} />
                      <NumberField label="计划金额 ($)" value={round(stage.amount, 2)} readOnly onChange={() => {}} />
                    </div>
                    <div className="stage-row__meta">
                      <span>{index === 0 ? '首笔价格固定为基准价' : `自动反推跌幅 ${formatPercent(stage.drawdown, 2)}`}</span>
                      <strong>{formatCurrency(stage.shares, '', 3)} 股</strong>
                    </div>
                  </div>
                  <span className="stage-row__delete">
                    <MaterialIcon className="icon-button__icon" name="delete" />
                  </span>
                </article>
              ))}
            </div>

            <div className="progress-line">
              <div className="progress-line__head">
                <span>总权重分配</span>
                <strong>{formatPercent(computed.totalWeight, 0)}</strong>
              </div>
              <div className="progress-line__track">
                <div className="progress-line__value" style={{ width: `${Math.max(Math.min(computed.totalWeight, 100), 0)}%` }} />
              </div>
            </div>
          </SurfaceCard>

          <div className="warning-card">
            <div className="warning-card__title">
              <MaterialIcon className="icon-button__icon" filled name="warning" />
              风险提示
            </div>
            <p className="warning-card__text">
              当前权重变化会同步重算目标跌幅和入场价格。建议保留现金缓冲，并在极端波动下复核最大跌幅设置。
            </p>
          </div>

          <div className="editor-footer">
            <a className="button-secondary" href={links.home}>取消</a>
            <a className="button-primary" href={links.home}>
              <MaterialIcon className="icon-button__icon" name="save" />
              保存方案
            </a>
          </div>
        </div>
      </section>
    </WorkspaceShell>
  );
}
