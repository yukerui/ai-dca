(() => {
  const currentScript = document.currentScript;
  const group = currentScript ? currentScript.dataset.group || "" : "";

  const ACCUMULATION_KEY = "aiDcaAccumulationState";
  const DCA_KEY = "aiDcaDcaState";
  const DEFAULT_BASE_PRICE = 601.3;
  const DEFAULT_TOTAL_CAPITAL = 5480.55;
  const DEFAULT_MAX_DRAWDOWN = 20;
  const DEFAULT_SYMBOL = "QQQ";
  const DCA_ANNUAL_RETURN = 0.124;
  const FREQUENCY_PERIODS = {
    "每日": 21,
    "每周": 4,
    "双周": 2,
    "每两周": 2,
    "每月": 1,
  };

  function normalize(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function trimZeros(value) {
    return String(value).replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
  }

  function parseNumber(value) {
    const raw = String(value ?? "").replace(/,/g, "").replace(/[^\d.-]/g, "");
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function round(value, digits = 2) {
    const factor = 10 ** digits;
    return Math.round((Number(value) || 0) * factor) / factor;
  }

  function formatFixed(value, digits = 2) {
    return trimZeros(round(value, digits).toFixed(digits));
  }

  function formatCurrency(value, symbol = "$", digits = 2) {
    const amount = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(round(value, digits));
    return symbol === "¥" ? `${symbol} ${amount}` : `${symbol}${amount}`;
  }

  function formatPercent(value, digits = 1, keepSign = false) {
    const number = round(value, digits);
    const prefix = keepSign && number > 0 ? "+" : "";
    return `${prefix}${formatFixed(number, digits)}%`;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function sum(values) {
    return values.reduce((total, value) => total + (Number(value) || 0), 0);
  }

  function insideText(element, needle) {
    return normalize(element.textContent).includes(normalize(needle));
  }

  function unique(elements) {
    return [...new Set(elements.filter(Boolean))];
  }

  function loadState(key) {
    try {
      return JSON.parse(window.localStorage.getItem(key) || "null");
    } catch (_error) {
      return null;
    }
  }

  function saveState(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (_error) {
      // Ignore storage failures and keep the UI responsive.
    }
  }

  function detectCurrencySymbol(element, fallback = "$") {
    const text = normalize(element ? element.textContent : "");
    if (text.includes("¥") || text.includes("CNY")) {
      return "¥";
    }
    if (text.includes("$")) {
      return "$";
    }
    return fallback;
  }

  function findTextElement(text, selectors = "label, p, span, div, h1, h2, h3, h4, a, button") {
    const target = normalize(text);
    const matches = [...document.querySelectorAll(selectors)].filter((element) => {
      const value = normalize(element.textContent);
      return value && value.includes(target);
    });
    matches.sort((left, right) => normalize(left.textContent).length - normalize(right.textContent).length);
    return matches[0] || null;
  }

  function findExactTextElement(text, selectors = "label, p, span, div, h1, h2, h3, h4, a, button") {
    const target = normalize(text);
    return (
      [...document.querySelectorAll(selectors)].find((element) => normalize(element.textContent) === target) || null
    );
  }

  function findFieldForLabel(label) {
    if (!label) {
      return null;
    }
    if (label instanceof HTMLInputElement || label instanceof HTMLSelectElement || label instanceof HTMLTextAreaElement) {
      return label;
    }
    if (label.htmlFor) {
      const direct = document.getElementById(label.htmlFor);
      if (direct) {
        return direct;
      }
    }
    const scopes = [];
    if (label.parentElement) {
      scopes.push(label.parentElement);
    }
    if (label.closest("div")) {
      scopes.push(label.closest("div"));
    }
    if (label.parentElement && label.parentElement.parentElement) {
      scopes.push(label.parentElement.parentElement);
    }
    for (const scope of scopes) {
      const field = scope ? scope.querySelector("input, select, textarea") : null;
      if (field) {
        return field;
      }
    }
    let sibling = label.nextElementSibling;
    while (sibling) {
      const field = sibling.querySelector ? sibling.querySelector("input, select, textarea") : null;
      if (field) {
        return field;
      }
      sibling = sibling.nextElementSibling;
    }
    return null;
  }

  function findInputByLabel(text) {
    const labels = [...document.querySelectorAll("label")].filter((label) => insideText(label, text));
    for (const label of labels) {
      const field = findFieldForLabel(label);
      if (field) {
        return field;
      }
    }
    return null;
  }

  function findInputsByLabel(text) {
    const labels = [...document.querySelectorAll("label")].filter((label) => insideText(label, text));
    return unique(labels.map(findFieldForLabel));
  }

  function findValueElementByLabel(text, selectors = "label, p, span, div") {
    const label = findExactTextElement(text, selectors) || findTextElement(text, selectors);
    if (!label) {
      return null;
    }
    const parent = label.parentElement;
    if (parent) {
      const sibling = [...parent.children].find((child) => child !== label && normalize(child.textContent));
      if (sibling) {
        return sibling;
      }
    }
    let next = label.nextElementSibling;
    while (next) {
      if (normalize(next.textContent)) {
        return next;
      }
      next = next.nextElementSibling;
    }
    return null;
  }

  function findButtonsByChoices(choices) {
    const targets = new Set(choices.map((choice) => normalize(choice)));
    return [...document.querySelectorAll("button")].filter((button) => targets.has(normalize(button.textContent)));
  }

  function buttonLooksActive(button) {
    const className = String(button.className || "");
    return (
      className.includes("bg-primary") ||
      className.includes("text-on-primary") ||
      className.includes("border-primary") ||
      className.includes("shadow-primary") ||
      className.includes("text-blue-700") ||
      className.includes("text-blue-400")
    );
  }

  function setButtonState(buttons, activeText) {
    const target = normalize(activeText);
    buttons.forEach((button) => {
      const active = normalize(button.textContent) === target;
      button.classList.toggle("stitch-selected-chip", active);
      button.classList.toggle("stitch-unselected-chip", !active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
      button.dataset.stitchActive = active ? "true" : "false";
    });
  }

  function pickActiveChoice(buttons, savedValue) {
    const saved = normalize(savedValue);
    if (saved) {
      const match = buttons.find((button) => normalize(button.textContent) === saved);
      if (match) {
        return normalize(match.textContent);
      }
    }
    const activeButton = buttons.find(buttonLooksActive) || buttons.find((button) => button.dataset.stitchActive === "true");
    return normalize((activeButton || buttons[buttons.length - 1] || {}).textContent);
  }

  function lockDerivedInput(input) {
    if (!input) {
      return;
    }
    input.readOnly = true;
    input.dataset.stitchDerived = "true";
    input.classList.add("stitch-derived-input");
  }

  function detectSymbol(savedState) {
    if (savedState && savedState.symbol) {
      return savedState.symbol;
    }
    const headings = [...document.querySelectorAll("h1, h2, h3, p, span")]
      .map((element) => normalize(element.textContent))
      .filter(Boolean);
    for (const heading of headings) {
      const match = heading.match(/\b[A-Z]{2,6}\b/);
      if (match && !["CNY", "DCA"].includes(match[0])) {
        return match[0];
      }
    }
    return DEFAULT_SYMBOL;
  }

  function buildStagesFromWeights({ weights, totalCapital, basePrice, maxDrawdown }) {
    const safeWeights = weights.map((weight) => Math.max(weight, 0));
    const totalWeight = sum(safeWeights) || 1;
    const nonFirstWeights = safeWeights.slice(1);
    const nonFirstTotal = sum(nonFirstWeights);
    let cumulativeNonFirst = 0;

    const stages = safeWeights.map((weight, index) => {
      let drawdown = 0;
      if (index > 0) {
        cumulativeNonFirst += weight;
        const ratio = nonFirstTotal > 0 ? cumulativeNonFirst / nonFirstTotal : index / Math.max(safeWeights.length - 1, 1);
        drawdown = maxDrawdown * ratio;
      }
      const price = basePrice * (1 - drawdown / 100);
      const weightPercent = (weight / totalWeight) * 100;
      const amount = totalCapital * (weight / totalWeight);
      return {
        index,
        label: `阶段 ${index + 1}`,
        weight,
        weightPercent,
        drawdown,
        price,
        amount,
      };
    });

    const investedCapital = sum(stages.map((stage) => stage.amount));
    const averageCost =
      investedCapital > 0
        ? stages.reduce((total, stage) => total + stage.price * stage.amount, 0) / investedCapital
        : basePrice;

    return {
      stages,
      totalWeight,
      averageCost,
      investedCapital,
    };
  }

  function deriveMaxDrawdown(basePrice, lastPrice) {
    if (basePrice > 0 && lastPrice > 0 && lastPrice < basePrice) {
      return ((basePrice - lastPrice) / basePrice) * 100;
    }
    return DEFAULT_MAX_DRAWDOWN;
  }

  function buildAccumulationState({
    symbol,
    totalCapital,
    basePrice,
    maxDrawdown,
    reserveRatio = 0,
    grossCapital = null,
    stages,
    averageCost,
    source,
    currency = "$",
  }) {
    return {
      source,
      symbol,
      currency,
      totalCapital: round(totalCapital, 2),
      grossCapital: grossCapital == null ? null : round(grossCapital, 2),
      reserveRatio: round(reserveRatio, 2),
      basePrice: round(basePrice, 2),
      maxDrawdown: round(maxDrawdown, 2),
      averageCost: round(averageCost, 2),
      stages: stages.map((stage) => ({
        ...stage,
        weight: round(stage.weight, 2),
        weightPercent: round(stage.weightPercent, 2),
        drawdown: round(stage.drawdown, 2),
        price: round(stage.price, 2),
        amount: round(stage.amount, 2),
      })),
      updatedAt: new Date().toISOString(),
    };
  }

  function updateSegmentBar(bar, widths, labels) {
    if (!bar) {
      return;
    }
    const segments = [...bar.children];
    if (!segments.length) {
      return;
    }
    segments.forEach((segment, index) => {
      const value = widths[index] || 0;
      segment.style.width = `${round(value, 2)}%`;
      if (labels && labels[index] != null) {
        segment.title = labels[index];
      }
    });
  }

  function updateMetricCard(labelText, valueText, noteText) {
    const label = findExactTextElement(labelText, "p, span, div");
    if (!label) {
      return null;
    }
    let valueElement = label.nextElementSibling;
    while (valueElement && !normalize(valueElement.textContent)) {
      valueElement = valueElement.nextElementSibling;
    }
    if (valueElement) {
      valueElement.textContent = valueText;
    }
    let noteElement = valueElement ? valueElement.nextElementSibling : null;
    while (noteElement && !normalize(noteElement.textContent)) {
      noteElement = noteElement.nextElementSibling;
    }
    if (noteElement && noteText != null) {
      noteElement.textContent = noteText;
    }
    return label.parentElement;
  }

  function ensureRuntimeStyles() {
    if (document.getElementById("stitch-runtime-style")) {
      return;
    }
    const style = document.createElement("style");
    style.id = "stitch-runtime-style";
    style.textContent = `
      .stitch-selected-chip {
        background: #0058be !important;
        color: #ffffff !important;
        border-color: #0058be !important;
        box-shadow: 0 10px 20px rgba(0, 88, 190, 0.2) !important;
      }
      .stitch-unselected-chip {
        opacity: 0.92;
      }
      .stitch-derived-input {
        background: rgba(232, 240, 254, 0.9) !important;
      }
    `;
    document.head.appendChild(style);
  }

  function bindEvents(fields, sync) {
    unique(fields).forEach((field) => {
      if (!field) {
        return;
      }
      field.addEventListener("input", sync);
      field.addEventListener("change", sync);
    });
  }

  function bindSaveButtons(sync, labels) {
    labels.forEach((label) => {
      const button = findExactTextElement(label, "button");
      if (button) {
        button.addEventListener("click", sync);
      }
    });
  }

  function routeFor(targetKey) {
    const insidePages = window.location.pathname.includes("/pages/");
    const routes = {
      home: {
        root: "./index.html",
        page: "75a393ec1a2d424ebafa1d0e59402d26.html",
      },
      accum_edit: {
        root: "./pages/81fee20edb5542f08bb363ac837b327c.html",
        page: "81fee20edb5542f08bb363ac837b327c.html",
      },
      dca: {
        root: "./pages/530f6fe554444798820046dee4d4b889.html",
        page: "530f6fe554444798820046dee4d4b889.html",
      },
      history: {
        root: "./pages/65aaf3e700d3443c9810f6c727b045e8.html",
        page: "65aaf3e700d3443c9810f6c727b045e8.html",
      },
      catalog: {
        root: "./catalog.html",
        page: "../catalog.html",
      },
    };
    const route = routes[targetKey];
    if (!route) {
      return "#";
    }
    return insidePages ? route.page : route.root;
  }

  function isActiveNavItem(element) {
    const className = String(element.className || "");
    return (
      className.includes("border-b-2") ||
      className.includes("bg-white") ||
      className.includes("bg-surface-container-low") ||
      className.includes("bg-[#f2f4f6]") ||
      className.includes("text-blue-700") ||
      className.includes("text-[#0058be]") ||
      className.includes("text-primary")
    );
  }

  function findNavLabelNode(element) {
    const nodes = [...element.querySelectorAll("span, div, p")].filter((node) => {
      const value = normalize(node.textContent);
      if (!value) {
        return false;
      }
      return !String(node.className || "").includes("material-symbols-outlined");
    });
    return nodes[nodes.length - 1] || null;
  }

  function setNavItemLabel(element, text) {
    const label = findNavLabelNode(element);
    if (label) {
      label.textContent = text;
      return;
    }
    element.textContent = text;
  }

  function setNavItemIcon(element, iconName) {
    if (!iconName) {
      return;
    }
    const icon = element.querySelector(".material-symbols-outlined");
    if (icon) {
      icon.textContent = iconName;
    }
  }

  function normalizePrimaryTabs(activeKey) {
    const headerNav = [...document.querySelectorAll("header nav, nav")].find((nav) => {
      if (!nav.closest("header, nav")) {
        return false;
      }
      return nav.querySelectorAll("a").length >= 3;
    });
    if (!headerNav) {
      return false;
    }

    const links = [...headerNav.querySelectorAll("a")];
    if (links.length < 3) {
      return false;
    }

    const activeLink = links.find(isActiveNavItem) || links[0];
    const inactiveLink = links.find((link) => link !== activeLink) || activeLink;
    const activeClass = String(activeLink.className || "");
    const inactiveClass = String(inactiveLink.className || "");
    const specs = [
      { label: "初始建仓", key: "home", active: activeKey === "home" },
      { label: "加仓", key: "accum_edit", active: activeKey === "accum_edit" },
      { label: "定投", key: "dca", active: activeKey === "dca" },
    ];

    specs.forEach((spec, index) => {
      const link = links[index];
      if (!link) {
        return;
      }
      link.textContent = spec.label;
      link.setAttribute("href", routeFor(spec.key));
      link.className = spec.active ? activeClass : inactiveClass;
      link.style.display = "";
    });
    links.slice(3).forEach((link) => {
      link.style.display = "none";
    });
    return true;
  }

  function injectPrimaryTabs(activeKey) {
    if (document.getElementById("stitch-primary-tabs")) {
      return;
    }
    const main = document.querySelector("main");
    if (!main) {
      return;
    }

    const nav = document.createElement("nav");
    nav.id = "stitch-primary-tabs";
    nav.className =
      "mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur";

    [
      { label: "初始建仓", key: "home", active: activeKey === "home" },
      { label: "加仓", key: "accum_edit", active: activeKey === "accum_edit" },
      { label: "定投", key: "dca", active: activeKey === "dca" },
    ].forEach((spec) => {
      const anchor = document.createElement("a");
      anchor.href = routeFor(spec.key);
      anchor.textContent = spec.label;
      anchor.className = spec.active
        ? "inline-flex min-h-10 items-center rounded-full bg-[#0058be] px-4 text-sm font-bold text-white shadow-sm"
        : "inline-flex min-h-10 items-center rounded-full border border-slate-200 px-4 text-sm font-medium text-slate-600";
      nav.appendChild(anchor);
    });

    main.insertBefore(nav, main.firstChild);
  }

  function normalizeAccumulationSideNav() {
    const aside = document.querySelector("aside");
    if (!aside) {
      return;
    }

    [...aside.querySelectorAll("span, div, p")].forEach((node) => {
      const text = normalize(node.textContent);
      if (text === "建仓计划" || text === "筹码分布") {
        node.textContent = "加仓";
      }
      if (text === "数据分析") {
        node.textContent = "策略分析";
      }
      if (text === "历史记录" || text === "交易历史") {
        const row = node.closest("a, button, div");
        if (row && row !== aside) {
          row.style.display = "none";
        }
      }
    });
  }

  function normalizeDcaSideNav() {
    const asideNav = [...document.querySelectorAll("aside nav")].find((nav) => nav.querySelectorAll("a").length >= 3);
    if (!asideNav) {
      return;
    }

    const items = [...asideNav.querySelectorAll("a")];
    if (items.length < 3) {
      return;
    }

    const activeItem = items.find(isActiveNavItem) || items[0];
    const inactiveItem = items.find((item) => item !== activeItem) || activeItem;
    const activeClass = String(activeItem.className || "");
    const inactiveClass = String(inactiveItem.className || "");
    const specs = [
      { label: "定投配置", key: "dca", icon: "tactic", active: true },
      { label: "收益分析", key: "history", icon: "monitoring", active: false },
      { label: "风险提示", key: "catalog", icon: "warning", active: false },
    ];

    specs.forEach((spec, index) => {
      const item = items[index];
      if (!item) {
        return;
      }
      item.className = spec.active ? activeClass : inactiveClass;
      item.setAttribute("href", routeFor(spec.key));
      item.style.display = "";
      setNavItemIcon(item, spec.icon);
      setNavItemLabel(item, spec.label);
    });

    items.slice(3).forEach((item) => {
      item.style.display = "none";
    });
  }

  function setupClassicAccumulationEdit() {
    const priceInputs = findInputsByLabel("入场价格");
    const weightInputs = findInputsByLabel("分配权重");
    if (priceInputs.length < 2 || priceInputs.length !== weightInputs.length) {
      return false;
    }

    const savedState = loadState(ACCUMULATION_KEY);
    const totalCapitalInput = findInputByLabel("初始投资额");
    const summaryLabel = findExactTextElement("总权重重分配", "span, div, p");
    const summaryValue = summaryLabel && summaryLabel.parentElement
      ? [...summaryLabel.parentElement.children].find((child) => child !== summaryLabel)
      : null;
    const summaryBar = summaryLabel ? summaryLabel.parentElement.nextElementSibling : null;
    const currency = "$";
    const originalBasePrice = parseNumber(priceInputs[0].value) || savedState?.basePrice || DEFAULT_BASE_PRICE;
    const originalLastPrice = parseNumber(priceInputs[priceInputs.length - 1].value);
    const maxDrawdown = savedState?.maxDrawdown || deriveMaxDrawdown(originalBasePrice, originalLastPrice);

    if (savedState && savedState.stages && savedState.stages.length === weightInputs.length) {
      if (totalCapitalInput && savedState.totalCapital) {
        totalCapitalInput.value = formatFixed(savedState.totalCapital, 2);
      }
      priceInputs[0].value = formatFixed(savedState.basePrice || originalBasePrice, 2);
      savedState.stages.forEach((stage, index) => {
        if (weightInputs[index]) {
          weightInputs[index].value = formatFixed(stage.weight, 2);
        }
      });
    }

    priceInputs.slice(1).forEach(lockDerivedInput);

    const sync = () => {
      const totalCapital = parseNumber(totalCapitalInput?.value) || savedState?.totalCapital || DEFAULT_TOTAL_CAPITAL;
      const basePrice = parseNumber(priceInputs[0].value) || originalBasePrice;
      const weights = weightInputs.map((input) => Math.max(parseNumber(input.value), 0));
      if (!weights.some((weight) => weight > 0)) {
        weights[0] = 100;
      }
      const result = buildStagesFromWeights({
        weights,
        totalCapital,
        basePrice,
        maxDrawdown,
      });

      result.stages.forEach((stage, index) => {
        if (index > 0 && priceInputs[index]) {
          priceInputs[index].value = formatFixed(stage.price, 2);
        }
        if (weightInputs[index]) {
          weightInputs[index].value = formatFixed(stage.weight, 2);
        }
      });

      if (summaryValue) {
        summaryValue.textContent = `${formatFixed(result.totalWeight, 2)}%`;
        summaryValue.style.color = Math.abs(result.totalWeight - 100) < 0.05 ? "" : "#ba1a1a";
      }
      updateSegmentBar(
        summaryBar,
        result.stages.map((stage) => stage.weightPercent),
        result.stages.map((stage) => `${stage.label}: ${formatFixed(stage.weightPercent, 1)}%`),
      );

      const state = buildAccumulationState({
        source: "accum_edit",
        symbol: detectSymbol(savedState),
        currency,
        totalCapital,
        basePrice,
        maxDrawdown,
        stages: result.stages,
        averageCost: result.averageCost,
      });
      saveState(ACCUMULATION_KEY, state);
    };

    bindEvents([...priceInputs, ...weightInputs, totalCapitalInput], sync);
    bindSaveButtons(sync, ["保存更改", "保存策略"]);
    sync();
    return true;
  }

  function setupGridAccumulationEdit() {
    const rows = [...document.querySelectorAll("div.grid.grid-cols-12")].filter(
      (row) => row.querySelectorAll("input").length === 2 && insideText(row, "删除"),
    );
    if (rows.length < 2 || !findExactTextElement("目标阶梯配置", "h2, h3")) {
      return false;
    }

    const savedState = loadState(ACCUMULATION_KEY);
    const totalCapitalInput = findInputByLabel("初始投资额");
    const priceInputs = rows.map((row) => row.querySelectorAll("input")[0]);
    const weightInputs = rows.map((row) => row.querySelectorAll("input")[1]);
    const totalWeightValue = findValueElementByLabel("总计分配权重");
    const maxCapitalValue = findValueElementByLabel("最大建仓仓位");
    const averageCostValue = findValueElementByLabel("预估平均成本");
    const progressBar = totalWeightValue ? totalWeightValue.parentElement.nextElementSibling : null;

    const originalBasePrice = parseNumber(priceInputs[0].value) || savedState?.basePrice || DEFAULT_BASE_PRICE;
    const originalLastPrice = parseNumber(priceInputs[priceInputs.length - 1].value);
    const maxDrawdown = savedState?.maxDrawdown || deriveMaxDrawdown(originalBasePrice, originalLastPrice);

    if (savedState && savedState.stages && savedState.stages.length === weightInputs.length) {
      if (totalCapitalInput && savedState.totalCapital) {
        totalCapitalInput.value = formatFixed(savedState.totalCapital, 2);
      }
      priceInputs[0].value = formatFixed(savedState.basePrice || originalBasePrice, 2);
      savedState.stages.forEach((stage, index) => {
        if (weightInputs[index]) {
          weightInputs[index].value = `${formatFixed(stage.weight, 2)}%`;
        }
      });
    }

    priceInputs.slice(1).forEach(lockDerivedInput);

    const sync = () => {
      const totalCapital = parseNumber(totalCapitalInput?.value) || savedState?.totalCapital || 10000;
      const basePrice = parseNumber(priceInputs[0].value) || originalBasePrice;
      const weights = weightInputs.map((input) => Math.max(parseNumber(input.value), 0));
      if (!weights.some((weight) => weight > 0)) {
        weights[0] = 100;
      }

      const result = buildStagesFromWeights({
        weights,
        totalCapital,
        basePrice,
        maxDrawdown,
      });

      result.stages.forEach((stage, index) => {
        if (index > 0 && priceInputs[index]) {
          priceInputs[index].value = formatFixed(stage.price, 2);
        }
        if (weightInputs[index]) {
          weightInputs[index].value = `${formatFixed(stage.weight, 2)}%`;
        }
      });

      if (totalWeightValue) {
        totalWeightValue.textContent = `${formatFixed(result.totalWeight, 2)}%`;
      }
      if (maxCapitalValue) {
        maxCapitalValue.textContent = formatCurrency(totalCapital, "$");
      }
      if (averageCostValue) {
        averageCostValue.textContent = formatCurrency(result.averageCost, "$");
      }
      const innerBar = progressBar ? progressBar.querySelector("div") : null;
      if (innerBar) {
        innerBar.style.width = `${clamp((result.totalWeight / 100) * 100, 0, 100)}%`;
      }

      const state = buildAccumulationState({
        source: "accum_edit",
        symbol: detectSymbol(savedState),
        currency: "$",
        totalCapital,
        basePrice,
        maxDrawdown,
        stages: result.stages,
        averageCost: result.averageCost,
      });
      saveState(ACCUMULATION_KEY, state);
    };

    bindEvents([...priceInputs, ...weightInputs, totalCapitalInput], sync);
    bindSaveButtons(sync, ["保存更改", "保存策略"]);
    sync();
    return true;
  }

  function setupMultiplierAccumulationEdit() {
    const rows = [...document.querySelectorAll("div.grid.grid-cols-12")].filter((row) => {
      const inputs = row.querySelectorAll('input[type="number"]');
      return inputs.length === 2 && insideText(row, "倍");
    });
    if (rows.length < 2 || !findExactTextElement("资金分配摘要", "h3")) {
      return false;
    }

    const savedState = loadState(ACCUMULATION_KEY);
    const drawdownInputs = rows.map((row) => row.querySelectorAll('input[type="number"]')[0]);
    const multiplierInputs = rows.map((row) => row.querySelectorAll('input[type="number"]')[1]);
    const amountElements = rows.map((row) => {
      const amountCell = row.querySelector(".col-span-4");
      return amountCell ? amountCell.querySelector("span, p, div") : null;
    });
    const reserveValue = findValueElementByLabel("当前策略预留资金");
    const utilizationValue = findValueElementByLabel("资金利用率");
    const progressBar = reserveValue ? reserveValue.parentElement.parentElement.querySelector(".relative.h-4") : null;
    const legendRow = progressBar ? progressBar.nextElementSibling : null;
    const costDropValue = findValueElementByLabel("预期成本降幅");
    const reserveCapital = parseNumber(reserveValue?.textContent) || savedState?.totalCapital || 150000;
    const basePrice = savedState?.basePrice || DEFAULT_BASE_PRICE;
    const symbol = detectSymbol(savedState);

    if (savedState && savedState.stages && savedState.stages.length === rows.length) {
      savedState.stages.forEach((stage, index) => {
        if (drawdownInputs[index]) {
          drawdownInputs[index].value = formatFixed(stage.drawdown, 2);
        }
        if (multiplierInputs[index]) {
          multiplierInputs[index].value = formatFixed(stage.weight, 2);
        }
      });
    }

    const sync = () => {
      const drawdowns = drawdownInputs.map((input) => clamp(parseNumber(input.value), 0, 100));
      const multipliers = multiplierInputs.map((input) => Math.max(parseNumber(input.value), 0));
      if (!multipliers.some((value) => value > 0)) {
        multipliers[0] = 1;
      }
      const multiplierTotal = sum(multipliers) || 1;
      const stages = multipliers.map((multiplier, index) => {
        const amount = reserveCapital * (multiplier / multiplierTotal);
        const weightPercent = (multiplier / multiplierTotal) * 100;
        const price = basePrice * (1 - drawdowns[index] / 100);
        return {
          index,
          label: `阶段 ${index + 1}`,
          weight: multiplier,
          weightPercent,
          drawdown: drawdowns[index],
          price,
          amount,
        };
      });
      const averageCost =
        reserveCapital > 0
          ? stages.reduce((total, stage) => total + stage.price * stage.amount, 0) / reserveCapital
          : basePrice;

      stages.forEach((stage, index) => {
        if (amountElements[index]) {
          amountElements[index].textContent = formatCurrency(stage.amount, "¥");
        }
      });
      if (utilizationValue) {
        utilizationValue.textContent = `${formatFixed((sum(stages.map((stage) => stage.amount)) / reserveCapital) * 100, 1)}%`;
      }
      updateSegmentBar(
        progressBar,
        stages.map((stage) => stage.weightPercent),
        stages.map((stage) => `${stage.label}: ${formatFixed(stage.weightPercent, 1)}%`),
      );
      if (legendRow) {
        legendRow.innerHTML = stages
          .map((stage, index) => {
            const alpha = round(clamp(0.28 + index * 0.18, 0.28, 0.92), 2);
            return `<div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full" style="background: rgba(0, 88, 190, ${alpha});"></span> 阶梯 ${String(index + 1).padStart(2, "0")} (${formatFixed(stage.weightPercent, 1)}%)</div>`;
          })
          .join("");
      }
      if (costDropValue) {
        const costDrop = ((averageCost - basePrice) / basePrice) * 100;
        costDropValue.textContent = formatPercent(costDrop, 1);
      }

      const state = buildAccumulationState({
        source: "accum_edit",
        symbol,
        currency: "¥",
        totalCapital: reserveCapital,
        basePrice,
        maxDrawdown: Math.max(...drawdowns, DEFAULT_MAX_DRAWDOWN),
        stages,
        averageCost,
      });
      saveState(ACCUMULATION_KEY, state);
    };

    bindEvents([...drawdownInputs, ...multiplierInputs], sync);
    bindSaveButtons(sync, ["保存更改", "保存策略"]);
    sync();
    return true;
  }

  function parseTriggerDrawdown(select) {
    const text = normalize(select ? select.options[select.selectedIndex]?.textContent || select.value : "");
    const matched = text.match(/(\d+(?:\.\d+)?)\s*%/);
    return matched ? Number(matched[1]) : 0;
  }

  function setupNewAccumulationPlan() {
    const totalCapitalInput = findInputByLabel("总投资额");
    const reserveSlider = document.querySelector('input[type="range"]');
    const ratioInputs = findInputsByLabel("分配比例");
    const triggerSelects = findInputsByLabel("触发条件");
    if (!totalCapitalInput || !reserveSlider || ratioInputs.length < 2 || ratioInputs.length !== triggerSelects.length) {
      return false;
    }

    const savedState = loadState(ACCUMULATION_KEY);
    const symbolInput =
      document.querySelector('input[type="text"][placeholder*="股票"]') ||
      document.querySelector('input[type="text"][placeholder*="AAPL"]');
    const reserveValue = reserveSlider.parentElement ? reserveSlider.parentElement.querySelector("span:last-child") : null;
    const budgetValue = findValueElementByLabel("计划建仓总预算");
    const averageCostValue = findValueElementByLabel("预估平均成本");
    const liquidityHint = [...document.querySelectorAll("p")].find((paragraph) =>
      insideText(paragraph, "最终持仓比例将达到"),
    );
    const pyramidBars = [...document.querySelectorAll('[title^="Batch"]')];
    const budgetCurrency = detectCurrencySymbol(budgetValue, "¥");
    const basePrice = savedState?.basePrice || DEFAULT_BASE_PRICE;

    const displayedBudget = parseNumber(budgetValue?.textContent) || 70000;
    if (savedState && savedState.stages && savedState.stages.length === ratioInputs.length) {
      totalCapitalInput.value = formatFixed(savedState.grossCapital || savedState.totalCapital / (1 - (savedState.reserveRatio || 0) / 100), 2);
      reserveSlider.value = formatFixed(savedState.reserveRatio || 30, 0);
      if (symbolInput && !symbolInput.value) {
        symbolInput.value = savedState.symbol || "";
      }
      savedState.stages.forEach((stage, index) => {
        if (ratioInputs[index]) {
          ratioInputs[index].value = formatFixed(stage.weight, 2);
        }
      });
    } else if (!parseNumber(totalCapitalInput.value)) {
      const initialReserve = parseNumber(reserveValue?.textContent) || 30;
      const grossCapital = displayedBudget / Math.max(1 - initialReserve / 100, 0.01);
      totalCapitalInput.value = formatFixed(grossCapital, 2);
      reserveSlider.value = formatFixed(initialReserve, 0);
    }

    const sync = () => {
      const grossCapital = parseNumber(totalCapitalInput.value) || 0;
      const reserveRatio = clamp(parseNumber(reserveSlider.value) || 30, 0, 90);
      const investableCapital = grossCapital * (1 - reserveRatio / 100);
      const weights = ratioInputs.map((input) => Math.max(parseNumber(input.value), 0));
      if (!weights.some((weight) => weight > 0)) {
        weights[0] = 100;
      }
      const totalWeight = sum(weights) || 1;
      const drawdowns = triggerSelects.map(parseTriggerDrawdown);
      const stages = weights.map((weight, index) => {
        const amount = investableCapital * (weight / totalWeight);
        const drawdown = drawdowns[index];
        const price = basePrice * (1 - drawdown / 100);
        return {
          index,
          label: `阶段 ${index + 1}`,
          weight,
          weightPercent: (weight / totalWeight) * 100,
          drawdown,
          price,
          amount,
        };
      });
      const averageCost =
        investableCapital > 0
          ? stages.reduce((total, stage) => total + stage.price * stage.amount, 0) / investableCapital
          : basePrice;

      if (reserveValue) {
        reserveValue.textContent = `${formatFixed(reserveRatio, 0)}%`;
      }
      if (budgetValue) {
        budgetValue.textContent = formatCurrency(investableCapital, budgetCurrency);
      }
      if (averageCostValue) {
        averageCostValue.textContent = formatCurrency(averageCost, budgetCurrency);
      }
      if (liquidityHint) {
        liquidityHint.innerHTML = `若触发所有梯队，最终持仓比例将达到 <span class="font-bold text-on-surface">${formatFixed(
          100 - reserveRatio,
          0,
        )}%</span>，预留流动性 <span class="font-bold text-on-surface">${formatFixed(reserveRatio, 0)}%</span>。`;
      }
      if (pyramidBars.length) {
        const maxWeight = Math.max(...weights, 1);
        pyramidBars.forEach((bar, index) => {
          const ratio = weights[index] / maxWeight;
          bar.style.height = `${Math.max(20, round(20 + ratio * 60, 0))}%`;
          bar.title = `${stages[index].label}: ${formatFixed(stages[index].weightPercent, 1)}%`;
        });
      }

      const state = buildAccumulationState({
        source: "accum_new",
        symbol: normalize(symbolInput?.value) || detectSymbol(savedState),
        currency: budgetCurrency,
        totalCapital: investableCapital,
        grossCapital,
        reserveRatio,
        basePrice,
        maxDrawdown: Math.max(...drawdowns, DEFAULT_MAX_DRAWDOWN),
        stages,
        averageCost,
      });
      saveState(ACCUMULATION_KEY, state);
    };

    bindEvents([totalCapitalInput, reserveSlider, ...ratioInputs, ...triggerSelects, symbolInput], sync);
    bindSaveButtons(sync, ["确认创建"]);
    sync();
    return true;
  }

  function setupDcaPlan() {
    const initialInput = findInputByLabel("初始投资额");
    const recurringInput = findInputByLabel("定期投资额");
    const durationSelect = findInputByLabel("投资期限") || findInputByLabel("结束条件");
    const frequencyButtons = findButtonsByChoices(["每日", "每周", "双周", "每两周", "每月"]);
    if (!initialInput || !recurringInput || !durationSelect || !frequencyButtons.length) {
      return false;
    }

    const savedState = loadState(DCA_KEY);
    const executionButtons = findButtonsByChoices(["每月 1 号", "每月 15 号", "最后一天"]);
    const totalInvestmentValue = findValueElementByLabel("总投资额");
    const gainValue = findValueElementByLabel("累计收益") || findValueElementByLabel("预计收益");
    const previewAnchor =
      findExactTextElement("预期增长预览", "h3, span") ||
      findExactTextElement("预期增长预期", "span, h3") ||
      findExactTextElement("策略效果预览", "h3");
    const previewCard = previewAnchor ? previewAnchor.closest("div.rounded-xl, div.rounded-2xl, div") : null;
    const previewTotalValue = previewCard
      ? [...previewCard.querySelectorAll("div, p, span")].find((element) => /[¥$]/.test(element.textContent) && /text-4xl|text-3xl/.test(String(element.className)))
      : null;
    const totalCurrency = detectCurrencySymbol(totalInvestmentValue, "¥");

    if (savedState) {
      if (savedState.initialInvestment) {
        initialInput.value = formatFixed(savedState.initialInvestment, 2);
      }
      if (savedState.recurringInvestment) {
        recurringInput.value = formatFixed(savedState.recurringInvestment, 2);
      }
      if (savedState.durationText) {
        const option = [...durationSelect.options].find(
          (candidate) => normalize(candidate.textContent) === normalize(savedState.durationText),
        );
        if (option) {
          durationSelect.value = option.value;
        }
      }
    }

    let activeFrequency = pickActiveChoice(frequencyButtons, savedState?.frequency || "");
    let activeExecution = executionButtons.length
      ? pickActiveChoice(executionButtons, savedState?.executionDate || "")
      : "";

    setButtonState(frequencyButtons, activeFrequency);
    setButtonState(executionButtons, activeExecution);

    const sync = () => {
      const initialInvestment = parseNumber(initialInput.value);
      const recurringInvestment = parseNumber(recurringInput.value);
      const durationText = normalize(durationSelect.options[durationSelect.selectedIndex]?.textContent || durationSelect.value);
      const periodsPerMonth = FREQUENCY_PERIODS[activeFrequency] || 1;

      let months = 24;
      let periods = periodsPerMonth * months;
      const monthMatch = durationText.match(/持续\s*(\d+)\s*个月/);
      if (monthMatch) {
        months = Number(monthMatch[1]);
        periods = months * periodsPerMonth;
      } else if (durationText.includes("本金消耗完毕")) {
        periods = recurringInvestment > 0 ? Math.ceil(initialInvestment / recurringInvestment) : 0;
        months = periodsPerMonth > 0 ? periods / periodsPerMonth : periods;
      } else if (durationText.includes("目标收益") || durationText.includes("不设限")) {
        months = 24;
        periods = months * periodsPerMonth;
      }

      const totalInvestment = initialInvestment + recurringInvestment * periods;
      const projectedValue = totalInvestment * Math.pow(1 + DCA_ANNUAL_RETURN, months / 12);
      const estimatedGain = projectedValue - totalInvestment;

      if (totalInvestmentValue) {
        totalInvestmentValue.textContent = formatCurrency(totalInvestment, totalCurrency);
      }
      if (gainValue) {
        gainValue.textContent = formatCurrency(estimatedGain, totalCurrency);
      }
      if (previewTotalValue) {
        previewTotalValue.textContent = formatCurrency(projectedValue, totalCurrency);
      }

      const monthLabels = [...document.querySelectorAll("span, div, p")].filter((element) =>
        /第\s*\d+\s*个月|\d+\s*个月/.test(normalize(element.textContent)),
      );
      if (monthLabels.length) {
        const lastLabel = monthLabels[monthLabels.length - 1];
        const original = normalize(lastLabel.textContent);
        lastLabel.textContent = original.startsWith("第") ? `第 ${round(months, 0)} 个月` : `${round(months, 0)}个月`;
      }

      saveState(DCA_KEY, {
        frequency: activeFrequency,
        executionDate: activeExecution,
        durationText,
        months: round(months, 2),
        periods: round(periods, 2),
        initialInvestment: round(initialInvestment, 2),
        recurringInvestment: round(recurringInvestment, 2),
        totalInvestment: round(totalInvestment, 2),
        projectedValue: round(projectedValue, 2),
        estimatedGain: round(estimatedGain, 2),
        updatedAt: new Date().toISOString(),
      });
    };

    frequencyButtons.forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        activeFrequency = normalize(button.textContent);
        setButtonState(frequencyButtons, activeFrequency);
        sync();
      });
    });
    executionButtons.forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        activeExecution = normalize(button.textContent);
        setButtonState(executionButtons, activeExecution);
        sync();
      });
    });

    bindEvents([initialInput, recurringInput, durationSelect], sync);
    bindSaveButtons(sync, ["保存并启动策略"]);
    sync();
    return true;
  }

  function createStageCardHtml(stage, index, currency) {
    if (index === 0) {
      return `
        <div class="bg-white p-5 rounded-xl border border-secondary/20 shadow-sm relative">
          <span class="absolute top-3 right-3 material-symbols-outlined text-secondary" style="font-variation-settings: 'FILL' 1;">check_circle</span>
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">${stage.label}</p>
          <h5 class="text-xl font-bold font-manrope">${formatCurrency(stage.price, currency)}</h5>
          <p class="text-xs text-secondary font-medium mt-1">已完成首笔建仓</p>
        </div>
      `;
    }
    if (index === 1) {
      return `
        <div class="glass-card p-5 rounded-xl border-2 border-primary shadow-lg z-10" style="transform: scale(1.02);">
          <div class="flex justify-between items-start mb-1">
            <p class="text-[10px] font-bold text-primary uppercase tracking-widest">${stage.label}</p>
            <span class="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">运行中</span>
          </div>
          <h5 class="text-xl font-bold font-manrope text-on-surface">${formatCurrency(stage.price, currency)}</h5>
          <p class="text-xs text-on-surface-variant font-medium mt-1 italic">等待回调触发</p>
        </div>
      `;
    }
    return `
      <div class="bg-surface-container p-5 rounded-xl border border-transparent shadow-sm opacity-70">
        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">${stage.label}</p>
        <h5 class="text-xl font-bold font-manrope">${formatCurrency(stage.price, currency)}</h5>
        <p class="text-xs text-slate-500 font-medium mt-1">待触发</p>
      </div>
    `;
  }

  function setupHomeDashboard() {
    const state = loadState(ACCUMULATION_KEY);
    if (!state || !state.stages || !state.stages.length) {
      return false;
    }

    const currency = detectCurrencySymbol(findValueElementByLabel("总投资额"), "$");
    const firstStage = state.stages[0];
    const nextStage = state.stages[1] || firstStage;
    const remainingBudget = Math.max((state.totalCapital || 0) - (firstStage?.amount || 0), 0);
    const remainingPercent = state.totalCapital > 0 ? (remainingBudget / state.totalCapital) * 100 : 0;
    const averageDelta = state.basePrice > 0 ? ((state.averageCost - state.basePrice) / state.basePrice) * 100 : 0;

    const totalCard = updateMetricCard("总投资额", formatCurrency(state.totalCapital, currency));
    updateMetricCard("剩余预算", formatCurrency(remainingBudget, currency), `${formatFixed(remainingPercent, 1)}% 可用资金`);
    updateMetricCard("下次买入价", formatCurrency(nextStage.price, currency), "等待信号");
    updateMetricCard(
      "平均成本",
      formatCurrency(state.averageCost, currency),
      `${averageDelta <= 0 ? "" : "+"}${formatFixed(averageDelta, 1)}% 相对首笔`,
    );

    if (totalCard) {
      const progress = totalCard.querySelector("div div");
      if (progress) {
        progress.style.width = `${clamp((firstStage.amount / Math.max(state.totalCapital, 1)) * 100, 0, 100)}%`;
      }
    }

    const title = [...document.querySelectorAll("h1")].find((element) => insideText(element, "建仓策略"));
    if (title) {
      title.textContent = `${state.symbol} 建仓策略`;
    }
    const subtitle = title && title.parentElement ? title.parentElement.querySelector("p") : null;
    if (subtitle) {
      subtitle.textContent = `${state.symbol} 金字塔建仓模型`;
    }

    const cardGrid = [...document.querySelectorAll("div.grid")].find(
      (grid) => insideText(grid, "阶段 1") && insideText(grid, "阶段 2"),
    );
    if (cardGrid) {
      const columns = state.stages.length >= 4 ? "grid grid-cols-1 md:grid-cols-4 gap-4" : "grid grid-cols-1 md:grid-cols-3 gap-4";
      cardGrid.className = columns;
      cardGrid.innerHTML = state.stages.map((stage, index) => createStageCardHtml(stage, index, currency)).join("");
    }

    const detailsTable = [...document.querySelectorAll("table")].find(
      (table) => insideText(table, "阶段") && insideText(table, "金额"),
    );
    if (detailsTable) {
      const tbody = detailsTable.querySelector("tbody");
      if (tbody) {
        tbody.innerHTML = state.stages
          .map((stage, index) => {
            const emphasisClass = index === 1 ? ' class="bg-primary/5"' : index > 1 ? ' class="opacity-70"' : "";
            const labelClass = index === 0 ? "text-secondary" : index === 1 ? "text-primary" : "text-slate-400";
            const drawdownText = index === 0 ? "基准" : `-${formatFixed(stage.drawdown, 1)}%`;
            return `
              <tr${emphasisClass}>
                <td class="px-3 py-4 font-bold ${labelClass}">${String(index + 1).padStart(2, "0")}</td>
                <td class="px-3 py-4 font-medium">${formatCurrency(stage.price, currency)}</td>
                <td class="px-3 py-4 ${index === 0 ? "" : "text-error"}">${drawdownText}</td>
                <td class="px-3 py-4 font-bold">${formatCurrency(stage.amount, currency, 0)}</td>
              </tr>
            `;
          })
          .join("");
      }
    }

    const modelContainer = document.querySelector("div.w-full.max-w-\\[200px\\].flex.flex-col.gap-1");
    if (modelContainer) {
      const maxWeight = Math.max(...state.stages.map((stage) => stage.weightPercent), 1);
      modelContainer.innerHTML = state.stages
        .map((stage, index) => {
          const width = 40 + (index / Math.max(state.stages.length - 1, 1)) * 60;
          const alpha = round(clamp(0.18 + index * 0.18, 0.18, 0.88), 2);
          const height = 32 + (stage.weightPercent / maxWeight) * 24;
          const roundedTopStyle = index === 0 ? "border-top-left-radius: 0.125rem; border-top-right-radius: 0.125rem;" : "";
          const roundedBottomStyle = index === state.stages.length - 1 ? "border-bottom-left-radius: 0.125rem; border-bottom-right-radius: 0.125rem; box-shadow: 0 10px 20px rgba(0, 88, 190, 0.18);" : "";
          return `
            <div class="flex items-center justify-center mx-auto"
              style="width: ${round(width, 0)}%; height: ${round(height, 0)}px; background: rgba(0, 88, 190, ${alpha}); border-left: 2px solid rgba(0, 88, 190, ${Math.min(alpha + 0.08, 1)}); border-right: 2px solid rgba(0, 88, 190, ${Math.min(alpha + 0.08, 1)}); ${roundedTopStyle} ${roundedBottomStyle}">
              <span class="${index === state.stages.length - 1 ? "text-base font-extrabold text-white" : "text-xs font-bold text-primary"}">${formatFixed(
                stage.weightPercent,
                1,
              )}%</span>
            </div>
          `;
        })
        .join("");
    }

    const historicalAverage = [...document.querySelectorAll("p")].find((paragraph) =>
      insideText(paragraph, "平均成本:"),
    );
    if (historicalAverage) {
      historicalAverage.textContent = `平均成本: ${formatCurrency(state.averageCost, currency)}`;
    }

    return true;
  }

  function run() {
    ensureRuntimeStyles();
    if (group === "accum_edit") {
      normalizeAccumulationSideNav();
      setupClassicAccumulationEdit() || setupGridAccumulationEdit() || setupMultiplierAccumulationEdit();
      return;
    }
    if (group === "accum_new") {
      setupNewAccumulationPlan();
      return;
    }
    if (group === "dca") {
      normalizePrimaryTabs("dca") || injectPrimaryTabs("dca");
      normalizeDcaSideNav();
      setupDcaPlan();
      return;
    }
    if (group === "home") {
      setupHomeDashboard();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
})();
