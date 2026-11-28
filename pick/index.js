document.addEventListener("DOMContentLoaded", () => {
  const dateSelect = document.getElementById("date-select");
  const dateSelectorContainer = document.getElementById("date-selector-container");
  const mainContent = document.getElementById("main-content");
  const trackerContent = document.getElementById("tracker-content");
  const emptyState = document.getElementById("empty-state");

  // Tab 按钮
  const tabBtnDaily = document.getElementById("tab-btn-daily");
  const tabBtnTracker = document.getElementById("tab-btn-tracker");

  // 每日决策 DOM 元素
  const dailyActionSubtitle = document.getElementById("daily-action-subtitle");
  const dailyActionBody = document.getElementById("daily-action-body");
  const marketSummaryText = document.getElementById("market-summary-text");
  const badNewsTableBody = document.getElementById("bad-news-table-body");
  const catalystAccordion = document.getElementById("catalyst-accordion");
  const stockTabs = document.getElementById("stock-tabs");
  const stockDetailContent = document.getElementById("stock-detail-content");
  const excludedStockList = document.getElementById("excluded-stock-list");
  const watchStockList = document.getElementById("watch-stock-list");
  const operationSummaryText = document.getElementById("operation-summary-text");

  // 五号策略追踪看板 DOM 元素
  const strategyDateRange = document.getElementById("strategy-date-range");
  const strategyBenchLabel = document.getElementById("strategy-bench-label");
  const strategyUpdatedAt = document.getElementById("strategy-updated-at");
  const strategyCoverageNote = document.getElementById("strategy-coverage-note");
  const statTotalRet = document.getElementById("stat-total-ret");
  const statEndEquity = document.getElementById("stat-end-equity");
  const statAlpha = document.getElementById("stat-alpha");
  const statBenchRet = document.getElementById("stat-bench-ret");
  const statMaxDd = document.getElementById("stat-max-dd");
  const statRiskRatios = document.getElementById("stat-risk-ratios");
  const statWinPl = document.getElementById("stat-win-pl");
  const statExpectancy = document.getElementById("stat-expectancy");
  const activeHoldingsCard = document.getElementById("active-holdings-card");
  const activeHoldingsGrid = document.getElementById("active-holdings-grid");
  const monthlyAccordionContainer = document.getElementById("monthly-accordion-container");

  let currentDecisionData = null;
  let currentActiveTab = "daily"; // "daily" | "tracker"
  let strategyChartInstance = null;

  // --- 1. 视图切换逻辑 ---
  tabBtnDaily.addEventListener("click", () => {
    if (currentActiveTab === "daily") return;
    currentActiveTab = "daily";
    tabBtnDaily.classList.add("active");
    tabBtnTracker.classList.remove("active");
    trackerContent.style.display = "none";
    dateSelectorContainer.style.display = "flex";
    if (currentDecisionData) {
      mainContent.style.display = "grid";
    }
  });

  tabBtnTracker.addEventListener("click", () => {
    if (currentActiveTab === "tracker") return;
    currentActiveTab = "tracker";
    tabBtnTracker.classList.add("active");
    tabBtnDaily.classList.remove("active");
    mainContent.style.display = "none";
    dateSelectorContainer.style.display = "none";
    trackerContent.style.display = "block";
    loadStrategyTrackerData();
  });

  // --- 2. 初始化拉取决策日期列表 (优先 /api/decisions，兜底 data/list.json) ---
  fetchDates();

  function fetchDates() {
    fetch("/api/decisions")
      .then((res) => {
        if (!res.ok) throw new Error("API not available");
        return res.json();
      })
      .then((resData) => {
        if (resData.success && resData.data && resData.data.length > 0) {
          populateDateSelector(resData.data);
        } else {
          fallbackStaticDates();
        }
      })
      .catch(() => {
        fallbackStaticDates();
      });
  }

  function fallbackStaticDates() {
    fetch(`data/list.json?t=${new Date().getTime()}`)
      .then((res) => res.json())
      .then((datesArray) => {
        if (datesArray && datesArray.length > 0) {
          populateDateSelector(datesArray);
        } else {
          showEmptyState();
        }
      })
      .catch((err) => {
        console.error("加载日期列表失败:", err);
        showEmptyState();
      });
  }

  function populateDateSelector(dates) {
    dateSelect.innerHTML = "";
    dates.forEach((date) => {
      const opt = document.createElement("option");
      opt.value = date;
      const dateParts = date.split("-");
      opt.textContent = `📅 ${dateParts[0]}年${dateParts[1]}月${dateParts[2]}日`;
      dateSelect.appendChild(opt);
    });
    loadDecisionDetail(dates[0]);
  }

  dateSelect.addEventListener("change", (e) => {
    if (e.target.value) {
      loadDecisionDetail(e.target.value);
    }
  });

  // --- 3. 加载某一天具体的决策详情 ---
  function loadDecisionDetail(dateStr) {
    mainContent.style.display = "none";
    emptyState.style.display = "none";

    fetch(`/api/decisions/${dateStr}`)
      .then((res) => {
        if (!res.ok) throw new Error("API not available");
        return res.json();
      })
      .then((resData) => {
        if (resData.success && resData.data) {
          currentDecisionData = resData.data;
          renderDailyUI(resData.data);
          if (currentActiveTab === "daily") {
            mainContent.style.display = "grid";
          }
        } else {
          fallbackStaticDecisionDetail(dateStr);
        }
      })
      .catch(() => {
        fallbackStaticDecisionDetail(dateStr);
      });
  }

  function fallbackStaticDecisionDetail(dateStr) {
    fetch(`data/${dateStr}.json?t=${new Date().getTime()}`)
      .then((res) => res.json())
      .then((detailObj) => {
        currentDecisionData = detailObj;
        renderDailyUI(detailObj);
        if (currentActiveTab === "daily") {
          mainContent.style.display = "grid";
        }
      })
      .catch((err) => {
        console.error(`加载日期 ${dateStr} 决策详情失败:`, err);
        showEmptyState();
      });
  }

  function renderTradePlanHtml(stock) {
    const tp = stock.trade_plan;
    if (!tp) return "";

    const isPrimary = tp.is_primary_execution;
    const isHighVol = tp.tier && tp.tier.includes("8号");
    const tierCls = isHighVol ? "tier-badge-high" : "tier-badge-std";
    const priceSuffix = tp.ref_price ? ` (${tp.ref_price_type} ${tp.ref_price.toFixed(2)}元)` : "";
    const slPriceText = tp.sl_price ? `约 ${tp.sl_price.toFixed(2)} 元` : "按开盘买入价折算";
    const actPriceText = tp.act_price ? `约 ${tp.act_price.toFixed(2)} 元` : "按开盘买入价折算";
    const lockPriceText = tp.lock_price ? `约 ${tp.lock_price.toFixed(2)} 元` : "成本上浮保底";

    return `
      <div class="trade-plan-box ${isPrimary ? "primary-plan" : ""}">
        <div class="trade-plan-header">
          <div class="trade-plan-title">
            <i class="fa-solid fa-stopwatch"></i>
            <span>五号策略闭环交易计划</span>
            ${isPrimary ? '<span class="primary-exec-badge">Top 1 实盘执行标的</span>' : '<span class="ref-exec-badge">备选风控参考</span>'}
          </div>
          <div class="trade-plan-tags">
            <span class="tier-badge ${tierCls}">${tp.tier}</span>
            <span class="atr-tag">前日ATR14: ${tp.atr_pct !== undefined ? tp.atr_pct.toFixed(2) + "%" : "--"}${priceSuffix}</span>
          </div>
        </div>
        <div class="trade-plan-grid">
          <div class="tp-cell tp-sl">
            <span class="tp-label">硬止损线 (SL)</span>
            <span class="tp-val">${tp.sl_pct.toFixed(2)}%</span>
            <span class="tp-sub">${slPriceText}</span>
          </div>
          <div class="tp-cell tp-act">
            <span class="tp-label">移动激活线 (ACT)</span>
            <span class="tp-val">+${tp.act_pct.toFixed(2)}%</span>
            <span class="tp-sub">${actPriceText}</span>
          </div>
          <div class="tp-cell tp-cb">
            <span class="tp-label">峰值回撤 (1/4 CB)</span>
            <span class="tp-val">${tp.cb_pct.toFixed(2)}%</span>
            <span class="tp-sub">激活后自最高点回调触发</span>
          </div>
          <div class="tp-cell tp-lock">
            <span class="tp-label">激活保本底线</span>
            <span class="tp-val">+${tp.lock_pct.toFixed(2)}%</span>
            <span class="tp-sub">${lockPriceText}</span>
          </div>
        </div>
        <div class="trade-plan-timeline">
          <div class="tp-step">
            <span class="tp-step-dot buy"></span>
            <span><strong>T日买入</strong>: ${tp.buy_date} 09:30 开盘</span>
          </div>
          <div class="tp-step-arrow"><i class="fa-solid fa-arrow-right"></i></div>
          <div class="tp-step">
            <span class="tp-step-dot track"></span>
            <span><strong>T+1~T+2 跟踪</strong>: ${tp.monitor_start_date} ~ ${tp.monitor_end_date} 盘中触发止盈/止损</span>
          </div>
          <div class="tp-step-arrow"><i class="fa-solid fa-arrow-right"></i></div>
          <div class="tp-step">
            <span class="tp-step-dot exit"></span>
            <span><strong>T+3 到期轮动</strong>: ${tp.expire_date} 09:30 无条件平仓换股</span>
          </div>
        </div>
      </div>
    `;
  }

  function renderDailyActionChecklist(data) {
    if (!dailyActionBody) return;
    const actions = data.position_actions || [];
    const top1 = (data.top_three_stocks && data.top_three_stocks[0]) || null;
    const tp = top1 && top1.trade_plan ? top1.trade_plan : null;

    if (dailyActionSubtitle) {
      dailyActionSubtitle.textContent = `${data.date || "--"} 盘前指令 · 已有持仓 ${actions.length} 笔`;
    }

    let html = '<div class="action-list">';
    if (actions.length === 0) {
      html += `
        <div class="action-empty-banner">
          <i class="fa-solid fa-circle-check"></i>
          <span>当前无在途老仓需要处理，今日开盘仅需按右侧“五号策略闭环计划”执行新选 Top 1 标的。</span>
        </div>
      `;
    } else {
      actions.forEach((act) => {
        const urgCls = `urgency-${act.urgency || "normal"}`;
        const tierCls = act.tier && act.tier.includes("8号") ? "tier-badge-high" : "tier-badge-std";
        const retCls = act.unrealized_ret > 0 ? "ret-up" : act.unrealized_ret < 0 ? "ret-down" : "text-muted";
        const retSign = act.unrealized_ret > 0 ? "+" : "";
        html += `
          <div class="action-item ${urgCls}">
            <div class="action-item-top">
              <div class="action-stock-info">
                <span class="action-badge">${act.action_badge}</span>
                <strong class="action-stock-name">${act.name}</strong>
                <span class="font-mono text-muted">${act.code}</span>
                <span class="tier-badge ${tierCls}">${act.tier}</span>
                <span class="hold-day-pill">${act.hold_day_label || ""}</span>
              </div>
              <div class="action-ret-box">
                <span class="text-muted" style="font-size: 12px;">买入 ${act.buy_date} @ ${Number(act.buy_price).toFixed(2)}元</span>
                <span class="font-mono ${retCls}" style="margin-left: 10px;">昨收 ${Number(act.prev_close).toFixed(2)}元 (${retSign}${Number(act.unrealized_ret).toFixed(2)}%)</span>
              </div>
            </div>
            <div class="action-metrics">
              <span>今日防守止损价: <strong>${Number(act.stop_price).toFixed(2)}元</strong>${act.is_trailing ? " (已激活移动)" : ""}</span>
              <span>移动激活价: <strong>${Number(act.act_price).toFixed(2)}元</strong></span>
              <span>1/4回撤: <strong>${Number(act.cb_pct).toFixed(2)}%</strong></span>
              <span>激活保底: <strong>${Number(act.lock_price).toFixed(2)}元</strong></span>
              <span>T+3到期轮动: <strong>${act.expire_date} 09:30</strong></span>
            </div>
            <div class="action-instruction">${act.instruction}</div>
          </div>
        `;
      });
    }
    html += "</div>";

    if (top1 && tp) {
      const top1TierCls = tp.tier && tp.tier.includes("8号") ? "tier-badge-high" : "tier-badge-std";
      const refText = tp.ref_price ? `${tp.ref_price_type} ${Number(tp.ref_price).toFixed(2)}元` : "开盘价基准";
      html += `
        <div class="new-buy-strip">
          <div class="new-buy-title">
            <span class="primary-exec-badge">今日新开仓 Top 1</span>
            <strong>${top1.name} (${top1.code})</strong>
            <span class="tier-badge ${top1TierCls}">${tp.tier}</span>
            <span class="text-muted font-mono">ATR14=${tp.atr_pct}% | ${refText}</span>
          </div>
          <div class="new-buy-params">
            <span>硬止损 <strong>${tp.sl_pct}%</strong>${tp.sl_price ? ` (${tp.sl_price.toFixed(2)}元)` : ""}</span>
            <span>移动激活 <strong>+${tp.act_pct}%</strong>${tp.act_price ? ` (${tp.act_price.toFixed(2)}元)` : ""}</span>
            <span>1/4回撤 <strong>${tp.cb_pct}%</strong></span>
            <span>跟踪期 <strong>${tp.monitor_start_date} ~ ${tp.monitor_end_date}</strong></span>
            <span>最迟轮动 <strong>${tp.expire_date} 09:30</strong></span>
          </div>
        </div>
      `;
    }

    dailyActionBody.innerHTML = html;
  }

  // --- 4. 每日决策渲染逻辑 ---
  function renderDailyUI(data) {
    renderDailyActionChecklist(data);
    marketSummaryText.textContent = data.market_summary || "暂无大盘评述";

    badNewsTableBody.innerHTML = "";
    if (data.bad_news_table && data.bad_news_table.length > 0) {
      data.bad_news_table.forEach((item) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td class="bold text-color-red">${item.source}</td>
          <td>${item.content}</td>
          <td class="bold">${item.exclude}</td>
        `;
        badNewsTableBody.appendChild(tr);
      });
    } else {
      badNewsTableBody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">今日无重大消息利空排除项</td></tr>`;
    }

    catalystAccordion.innerHTML = "";
    if (data.catalyst_list && data.catalyst_list.length > 0) {
      data.catalyst_list.forEach((item, index) => {
        const accItem = document.createElement("div");
        accItem.className = `accordion-item ${index === 0 ? "active" : ""}`;
        accItem.innerHTML = `
          <div class="accordion-header">
            <span><i class="fa-solid fa-bolt text-color-yellow" style="margin-right: 8px;"></i>${item.title}</span>
            <i class="fa-solid fa-chevron-down accordion-icon"></i>
          </div>
          <div class="accordion-content">
            <p>${item.content}</p>
          </div>
        `;
        accItem.querySelector(".accordion-header").addEventListener("click", () => {
          accItem.classList.toggle("active");
        });
        catalystAccordion.appendChild(accItem);
      });
    }

    stockTabs.innerHTML = "";
    stockDetailContent.innerHTML = "";
    if (data.top_three_stocks && data.top_three_stocks.length > 0) {
      data.top_three_stocks.forEach((stock, index) => {
        const tabBtn = document.createElement("button");
        tabBtn.className = `tab-btn ${index === 0 ? "active" : ""}`;
        tabBtn.innerHTML = `
          <span class="badge badge-rank">Top ${stock.rank || index + 1}</span>
          <span>${stock.name}</span>
          <span class="tab-score">${stock.score ? stock.score + "分" : ""}</span>
        `;

        const detailCard = document.createElement("div");
        detailCard.className = `stock-panel ${index === 0 ? "active" : ""}`;
        detailCard.id = `stock-panel-${index}`;
        detailCard.innerHTML = `
          <div class="stock-panel-header">
            <div class="stock-title-wrap">
              <h3>${stock.name} <span class="stock-code">${stock.code}</span></h3>
              <span class="stock-direction-tag">${stock.direction || "主线重点"}</span>
            </div>
            <div class="stock-score-badge">
              <span class="score-num">${stock.score || "--"}</span>
              <span class="score-label">综合评分</span>
            </div>
          </div>

          <div class="stock-meta-grid">
            <div class="meta-item">
              <span class="meta-label"><i class="fa-solid fa-coins"></i> 市值参考</span>
              <span class="meta-val">${stock.market_cap || "正在校对..."}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label"><i class="fa-solid fa-chart-simple"></i> 近5日表现</span>
              <span class="meta-val">${stock.pct_change_5d || "正在校对..."}</span>
            </div>
          </div>

          ${renderTradePlanHtml(stock)}

          <div class="detail-section">
            <h4><i class="fa-solid fa-lightbulb"></i> 核心入选逻辑</h4>
            <p class="logic-text">${stock.logic}</p>
          </div>

          <div class="detail-section">
            <h4><i class="fa-solid fa-crosshairs"></i> 详细介入条件与风控要求</h4>
            <div class="condition-box">${stock.price_condition || stock.entry_condition || "按战法开盘竞价量比标准执行"}</div>
          </div>

          <div class="detail-section">
            <h4><i class="fa-solid fa-wave-square"></i> K线及筹码特征</h4>
            <p class="feature-text">${stock.k_features || stock.features || "均线多头排列，回踩均线支撑有力"}</p>
          </div>
        `;

        tabBtn.addEventListener("click", () => {
          document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
          document.querySelectorAll(".stock-panel").forEach((p) => p.classList.remove("active"));
          tabBtn.classList.add("active");
          detailCard.classList.add("active");
        });

        stockTabs.appendChild(tabBtn);
        stockDetailContent.appendChild(detailCard);
      });
    }

    excludedStockList.innerHTML = "";
    if (data.excluded_stocks && data.excluded_stocks.length > 0) {
      data.excluded_stocks.forEach((item) => {
        const li = document.createElement("li");
        li.innerHTML = `<strong>${item.name}</strong>: <span>${item.reason}</span>`;
        excludedStockList.appendChild(li);
      });
    }

    watchStockList.innerHTML = "";
    if (data.watch_list && data.watch_list.length > 0) {
      data.watch_list.forEach((item) => {
        const li = document.createElement("li");
        li.innerHTML = `<strong>${item.name}</strong> (${item.direction || "观察"}): <span>${item.logic || item.trigger || ""}</span>`;
        watchStockList.appendChild(li);
      });
    }

    if (window.marked && data.operation_summary) {
      operationSummaryText.innerHTML = marked.parse(data.operation_summary);
    } else {
      operationSummaryText.textContent = data.operation_summary || "按既定战法严格执行纪律。";
    }
  }

  // --- 5. 五号策略实盘追踪与月度折叠复盘看板 ---
  function loadStrategyTrackerData() {
    fetch("/api/strategy-backtest")
      .then((res) => {
        if (!res.ok) throw new Error("API not available");
        return res.json();
      })
      .then((resData) => {
        if (resData.success && resData.data) {
          renderStrategyDashboard(resData.data);
        } else {
          fallbackStaticStrategyBacktest();
        }
      })
      .catch(() => fallbackStaticStrategyBacktest());
  }

  function fallbackStaticStrategyBacktest() {
    fetch(`data/strategy_backtest.json?t=${new Date().getTime()}`)
      .then((res) => res.json())
      .then((payload) => renderStrategyDashboard(payload))
      .catch((err) => {
        console.error("加载五号策略回测数据失败:", err);
        monthlyAccordionContainer.innerHTML = `<div class="text-center text-muted" style="padding: 32px;">暂未找到五号策略追踪数据，请先运行同步脚本。</div>`;
      });
  }

  function formatSignedPct(val, digits = 2) {
    if (val === null || val === undefined || isNaN(val)) return "--";
    const num = Number(val);
    const sign = num > 0 ? "+" : "";
    return `${sign}${num.toFixed(digits)}%`;
  }

  function formatReturnSpan(val, digits = 2) {
    if (val === null || val === undefined || isNaN(val)) return '<span class="text-muted">--</span>';
    const num = Number(val);
    const cls = num > 0 ? "ret-up" : num < 0 ? "ret-down" : "text-muted";
    const sign = num > 0 ? "+" : "";
    return `<span class="${cls}">${sign}${num.toFixed(digits)}%</span>`;
  }

  function renderStrategyDashboard(payload) {
    if (!payload || !payload.summary) return;
    const sm = payload.summary;
    const dr = payload.date_range || {};
    const cov = payload.data_coverage || {};

    strategyDateRange.textContent = `${dr.start || "--"} ~ ${dr.end || "--"} (${dr.trading_days || 0} 个交易日)`;
    strategyBenchLabel.textContent = `基准：${payload.benchmark_name || "中证500"} (${payload.benchmark_code || "sh000905"})`;
    strategyUpdatedAt.textContent = `更新于 ${payload.updated_at || "--"}`;

    const covRate = cov.monitored_days > 0
      ? ((cov.covered_5m_days / cov.monitored_days) * 100).toFixed(1)
      : "100.0";
    strategyCoverageNote.textContent = `5分钟K线撮合覆盖: ${cov.covered_5m_days || 0}/${cov.monitored_days || 0} (${covRate}%, 日线回退 ${cov.fallback_days || 0} 天)`;

    // 渲染 KPI 卡片 (A股习惯红涨绿跌)
    statTotalRet.textContent = formatSignedPct(sm.total_ret);
    statTotalRet.className = `kpi-value ${sm.total_ret >= 0 ? "ret-up" : "ret-down"}`;
    statEndEquity.textContent = `期末净资产: ${Number(sm.end_equity || 0).toLocaleString("zh-CN", { maximumFractionDigits: 0 })} 元`;

    statAlpha.textContent = formatSignedPct(sm.alpha);
    statAlpha.className = `kpi-value ${sm.alpha >= 0 ? "ret-up" : "ret-down"}`;
    statBenchRet.textContent = `${payload.benchmark_name || "中证500"}同期: ${formatSignedPct(sm.bench_ret)} (最大回撤 ${sm.bench_max_dd}%)`;

    statMaxDd.textContent = `${Number(sm.max_dd).toFixed(2)}%`;
    statRiskRatios.textContent = `夏普: ${sm.sharpe} | 卡玛: ${sm.calmar}`;

    statWinPl.textContent = `${sm.win_rate}% / ${sm.pl_ratio}`;
    statExpectancy.textContent = `赢${formatSignedPct(sm.avg_win)} / 输${formatSignedPct(sm.avg_loss)} | 期望 ${formatSignedPct(sm.expectancy)}`;

    renderNavChart(payload.nav_series || [], payload.benchmark_name || "中证500");
    renderActiveHoldings(payload.active_holdings || [], payload.pending_today || null);
    renderMonthlyAccordion(payload.monthly_groups || [], payload.benchmark_name || "中证500");
  }

  function renderNavChart(series, benchName) {
    const canvas = document.getElementById("strategy-nav-chart");
    if (!canvas || !window.Chart) return;
    if (strategyChartInstance) {
      strategyChartInstance.destroy();
    }

    const labels = series.map((d) => d.date);
    const stratData = series.map((d) => d.strategy_ret_pct);
    const benchData = series.map((d) => d.bench_ret_pct);

    strategyChartInstance = new Chart(canvas.getContext("2d"), {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "五号策略累计收益率 (%)",
            data: stratData,
            borderColor: "#f43f5e",
            backgroundColor: "rgba(244, 63, 94, 0.14)",
            borderWidth: 2.5,
            pointRadius: 0,
            pointHoverRadius: 5,
            tension: 0.12,
            fill: true,
          },
          {
            label: `${benchName}基准收益率 (%)`,
            data: benchData,
            borderColor: "#38bdf8",
            backgroundColor: "transparent",
            borderWidth: 2,
            borderDash: [5, 4],
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.12,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            labels: { color: "#e2e8f0", font: { size: 12.5 } },
          },
          tooltip: {
            backgroundColor: "rgba(15, 23, 42, 0.94)",
            borderColor: "rgba(148, 163, 184, 0.25)",
            borderWidth: 1,
            titleColor: "#f8fafc",
            bodyColor: "#e2e8f0",
            callbacks: {
              label: (ctx) => {
                const idx = ctx.dataIndex;
                const item = series[idx];
                const v = Number(ctx.parsed.y);
                const sign = v > 0 ? "+" : "";
                if (ctx.datasetIndex === 0) {
                  return ` 五号策略: ${sign}${v.toFixed(2)}% (净值 ${item.nav.toFixed(4)})`;
                }
                return ` ${benchName}: ${sign}${v.toFixed(2)}% (净值 ${item.bench_nav.toFixed(4)})`;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: { color: "#94a3b8", maxTicksLimit: 10 },
            grid: { color: "rgba(51, 65, 85, 0.45)" },
          },
          y: {
            ticks: {
              color: "#94a3b8",
              callback: (val) => `${val > 0 ? "+" : ""}${val}%`,
            },
            grid: { color: "rgba(51, 65, 85, 0.45)" },
          },
        },
      },
    });
  }

  function renderActiveHoldings(holdings, pendingToday) {
    if ((!holdings || holdings.length === 0) && !pendingToday) {
      activeHoldingsCard.style.display = "none";
      return;
    }
    activeHoldingsCard.style.display = "block";
    activeHoldingsGrid.innerHTML = "";

    if (pendingToday && pendingToday.trade_plan) {
      const tp = pendingToday.trade_plan;
      const card = document.createElement("div");
      card.className = "holding-mini-card pending-card";
      card.innerHTML = `
        <div class="holding-top">
          <div>
            <strong>${pendingToday.name}</strong>
            <span class="font-mono text-muted">${pendingToday.code}</span>
          </div>
          <span class="status-pill pill-pending">⏳ 待开盘买入 (${pendingToday.date})</span>
        </div>
        <div class="holding-meta">
          <span class="tier-badge ${tp.tier.includes("8号") ? "tier-badge-high" : "tier-badge-std"}">${tp.tier}</span>
          <span>前日ATR14: ${tp.atr_pct}%</span>
        </div>
        <div class="holding-levels">
          <span>止损: <strong>${tp.sl_pct}%</strong> (${tp.sl_price || "--"}元)</span>
          <span>激活: <strong>+${tp.act_pct}%</strong> (${tp.act_price || "--"}元)</span>
          <span>回撤: <strong>${tp.cb_pct}%</strong></span>
        </div>
        <div class="holding-deadline">跟踪窗口: ${tp.monitor_start_date} ~ ${tp.monitor_end_date} | 到期轮动: ${tp.expire_date}</div>
      `;
      activeHoldingsGrid.appendChild(card);
    }

    (holdings || []).forEach((h) => {
      const card = document.createElement("div");
      const urgCls = h.next_action_urgency ? `urgency-${h.next_action_urgency}` : "";
      card.className = `holding-mini-card ${urgCls}`;
      const retHtml = formatReturnSpan(h.unrealized_ret);
      const profSign = h.unrealized_profit >= 0 ? "+" : "";
      const profCls = h.unrealized_profit >= 0 ? "ret-up" : "ret-down";
      const nextAlertHtml = h.next_action_badge
        ? `<div class="holding-next-alert">
             <span class="action-badge">${h.next_action_badge} (${h.next_trading_day || ""})</span>
             <p>${h.next_action_instruction || ""}</p>
           </div>`
        : "";
      card.innerHTML = `
        <div class="holding-top">
          <div>
            <strong>${h.name}</strong>
            <span class="font-mono text-muted">${h.code}</span>
          </div>
          <div class="holding-ret">${retHtml} <small class="${profCls}">(${profSign}${Number(h.unrealized_profit).toLocaleString("zh-CN", { maximumFractionDigits: 0 })}元)</small></div>
        </div>
        <div class="holding-meta">
          <span class="tier-badge ${h.tier.includes("8号") ? "tier-badge-high" : "tier-badge-std"}">${h.tier}</span>
          <span>买入: ${h.buy_date} @ ${h.buy_price.toFixed(2)}元</span>
          <span>最新: ${h.current_price.toFixed(2)}元</span>
        </div>
        <div class="holding-levels">
          <span>当前防守止损: <strong>${h.sl_price.toFixed(2)}元</strong>${h.is_trailing ? " (已激活移动)" : ""}</span>
          <span>激活价: <strong>${h.act_price.toFixed(2)}元</strong></span>
          <span>回撤: <strong>${h.cb_pct}%</strong></span>
        </div>
        ${nextAlertHtml}
        <div class="holding-deadline">最迟 T+3 到期轮动日: <strong>${h.expire_date} 09:30</strong></div>
      `;
      activeHoldingsGrid.appendChild(card);
    });
  }

  function formatExitTag(reason) {
    const map = {
      TRAILING_STOP: { text: "移动止盈", cls: "exit-tag-win" },
      TRAILING_OPEN: { text: "高开止盈", cls: "exit-tag-win" },
      SL_INTRADAY: { text: "盘中止损", cls: "exit-tag-loss" },
      SL_OPEN: { text: "跳空止损", cls: "exit-tag-loss" },
      ROTATE_T3_OPEN: { text: "T+3轮动", cls: "exit-tag-rotate" },
      HOLDING: { text: "持仓跟踪中", cls: "exit-tag-hold" },
    };
    const info = map[reason] || { text: reason || "--", cls: "exit-tag-rotate" };
    return `<span class="exit-tag ${info.cls}">${info.text}</span>`;
  }

  function renderMonthlyAccordion(groups, benchName) {
    monthlyAccordionContainer.innerHTML = "";
    if (!groups || groups.length === 0) {
      monthlyAccordionContainer.innerHTML = `<div class="text-center text-muted" style="padding: 32px;">暂无月度交易流水</div>`;
      return;
    }

    groups.forEach((grp, idx) => {
      const item = document.createElement("div");
      // 默认展开最新月份 (idx === 0)
      item.className = `month-accordion-item ${idx === 0 ? "active" : ""}`;

      const stratCls = grp.strategy_ret >= 0 ? "ret-up" : "ret-down";
      const benchCls = grp.bench_ret >= 0 ? "ret-up" : "ret-down";
      const alphaCls = grp.alpha >= 0 ? "ret-up" : "ret-down";
      const profitCls = grp.profit_amt >= 0 ? "ret-up" : "ret-down";
      const profSign = grp.profit_amt > 0 ? "+" : "";

      const rowsHtml = (grp.trades || [])
        .map((t) => {
          const tierCls = t.tier && t.tier.includes("8号") ? "tier-badge-high" : "tier-badge-std";
          const profStr = `${t.profit_amt > 0 ? "+" : ""}${Number(t.profit_amt).toLocaleString("zh-CN", { maximumFractionDigits: 0 })}元`;
          const profRowCls = t.profit_amt > 0 ? "ret-up" : t.profit_amt < 0 ? "ret-down" : "text-muted";
          return `
            <tr>
              <td class="font-mono bold">${t.buy_date}</td>
              <td class="font-mono">${t.code}</td>
              <td class="bold">${t.name}</td>
              <td><span class="tier-badge ${tierCls}">${t.tier}</span></td>
              <td class="font-mono">${Number(t.atr_pct).toFixed(2)}%</td>
              <td class="font-mono">${Number(t.buy_price).toFixed(2)}</td>
              <td class="font-mono text-muted">${Number(t.sl_pct).toFixed(1)}% / +${Number(t.act_pct).toFixed(1)}% / ${Number(t.cb_pct).toFixed(2)}%</td>
              <td class="font-mono">${t.exit_date} ${t.exit_time}</td>
              <td>${formatExitTag(t.exit_reason)}</td>
              <td class="font-mono">${Number(t.exit_price).toFixed(2)}</td>
              <td class="font-mono">${formatReturnSpan(t.net_return)}</td>
              <td class="font-mono ${profRowCls}">${profStr}</td>
              <td class="font-mono text-muted">${t.expire_date || "--"}</td>
            </tr>
          `;
        })
        .join("");

      item.innerHTML = `
        <div class="month-accordion-header">
          <div class="month-title-group">
            <i class="fa-solid fa-chevron-right month-chevron"></i>
            <span class="month-label">${grp.month_label}</span>
            <span class="month-count-badge">${grp.trade_count} 笔操作 (${grp.wins}胜 ${grp.losses}负 | 胜率 ${grp.win_rate}%)</span>
          </div>
          <div class="month-stats-pills">
            <span class="month-pill">策略: <strong class="${stratCls}">${formatSignedPct(grp.strategy_ret)}</strong></span>
            <span class="month-pill">${benchName}: <strong class="${benchCls}">${formatSignedPct(grp.bench_ret)}</strong></span>
            <span class="month-pill">月度Alpha: <strong class="${alphaCls}">${formatSignedPct(grp.alpha)}</strong></span>
            <span class="month-pill">月度盈亏: <strong class="${profitCls}">${profSign}${Number(grp.profit_amt).toLocaleString("zh-CN", { maximumFractionDigits: 0 })}元</strong></span>
          </div>
        </div>
        <div class="month-accordion-body">
          <div class="table-container">
            <table class="modern-table strategy-trades-table">
              <thead>
                <tr>
                  <th>买入日</th>
                  <th>代码</th>
                  <th>名称</th>
                  <th>档位</th>
                  <th>ATR14</th>
                  <th>买入价</th>
                  <th>止损 / 激活 / 回撤</th>
                  <th>离场时间 (5m)</th>
                  <th>离场方式</th>
                  <th>离场价</th>
                  <th>净收益率</th>
                  <th>盈亏金额</th>
                  <th>T+3轮动日</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml || '<tr><td colspan="13" class="text-center text-muted">本月暂无记录</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      `;

      item.querySelector(".month-accordion-header").addEventListener("click", () => {
        item.classList.toggle("active");
      });

      monthlyAccordionContainer.appendChild(item);
    });
  }

  function showEmptyState() {
    mainContent.style.display = "none";
    trackerContent.style.display = "none";
    emptyState.style.display = "block";
  }
});
