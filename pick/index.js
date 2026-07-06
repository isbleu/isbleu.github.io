document.addEventListener("DOMContentLoaded", () => {
  const dateSelect = document.getElementById("date-select");
  const mainContent = document.getElementById("main-content");
  const emptyState = document.getElementById("empty-state");

  // DOM 元素引用
  const marketSummaryText = document.getElementById("market-summary-text");
  const badNewsTableBody = document.getElementById("bad-news-table-body");
  const catalystAccordion = document.getElementById("catalyst-accordion");
  const stockTabs = document.getElementById("stock-tabs");
  const stockDetailContent = document.getElementById("stock-detail-content");
  const excludedStockList = document.getElementById("excluded-stock-list");
  const watchStockList = document.getElementById("watch-stock-list");
  const operationSummaryText = document.getElementById("operation-summary-text");

  let currentDecisionData = null;

  // 1. 初始化拉取日期列表（改为拉取静态的 data/list.json）
  fetch(`data/list.json?t=${new Date().getTime()}`)
    .then(res => res.json())
    .then(datesArray => {
      // 封装为与原版后端 API 一致的响应结构
      const resData = { success: true, data: datesArray };
      if (resData.success && resData.data && resData.data.length > 0) {
        // 清空占位选项
        dateSelect.innerHTML = "";
        
        // 填充下拉日期列表
        resData.data.forEach(date => {
          const opt = document.createElement("option");
          opt.value = date;
          // 将 YYYY-MM-DD 转为易读格式，如 "2026年07月03日"
          const dateParts = date.split("-");
          opt.textContent = `📅 ${dateParts[0]}年${dateParts[1]}月${dateParts[2]}日`;
          dateSelect.appendChild(opt);
        });

        // 默认加载最新的一天决策
        loadDecisionDetail(resData.data[0]);
      } else {
        showEmptyState();
      }
    })
    .catch(err => {
      console.error("加载日期列表失败:", err);
      showEmptyState();
    });

  // 日期选择切换监听
  dateSelect.addEventListener("change", (e) => {
    if (e.target.value) {
      loadDecisionDetail(e.target.value);
    }
  });

  // 2. 加载某一天具体的决策详情（改为读取静态 YYYY-MM-DD.json）
  function loadDecisionDetail(dateStr) {
    mainContent.style.display = "none";
    emptyState.style.display = "none";

    fetch(`data/${dateStr}.json?t=${new Date().getTime()}`)
      .then(res => res.json())
      .then(detailObj => {
        const resData = { success: true, data: detailObj };
        if (resData.success && resData.data) {
          currentDecisionData = resData.data;
          renderUI(resData.data);
          mainContent.style.display = "grid";
        } else {
          showEmptyState();
        }
      })
      .catch(err => {
        console.error(`加载日期 ${dateStr} 决策详情失败:`, err);
        showEmptyState();
      });
  }

  // 3. 页面渲染核心逻辑
  function renderUI(data) {
    // 3.1 渲染大盘评述
    marketSummaryText.textContent = data.market_summary;

    // 3.2 渲染利空排除表格
    badNewsTableBody.innerHTML = "";
    if (data.bad_news_table && data.bad_news_table.length > 0) {
      data.bad_news_table.forEach(item => {
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

    // 3.3 渲染催化折叠面板
    catalystAccordion.innerHTML = "";
    if (data.catalyst_list && data.catalyst_list.length > 0) {
      data.catalyst_list.forEach((cat, index) => {
        const item = document.createElement("div");
        item.className = `accordion-item ${index === 0 ? 'active' : ''}`;
        item.innerHTML = `
          <div class="accordion-header">
            <span>${cat.title}</span>
            <i class="fa-solid fa-chevron-down accordion-icon"></i>
          </div>
          <div class="accordion-content">
            <p>${cat.content}</p>
          </div>
        `;
        
        // 绑定折叠点击事件
        item.querySelector(".accordion-header").addEventListener("click", () => {
          // 关闭其他 active 项
          document.querySelectorAll(".accordion-item").forEach(el => {
            if (el !== item) el.classList.remove("active");
          });
          // 切换自身状态
          item.classList.toggle("active");
        });

        catalystAccordion.appendChild(item);
      });
    } else {
      catalystAccordion.innerHTML = `<div class="text-muted text-center">今日无重点催化题材数据</div>`;
    }

    // 3.4 渲染首选三标 (默认激活第一只股票)
    renderStockTabs(data.top_three_stocks);

    // 3.5 渲染排除列表与关注池
    excludedStockList.innerHTML = "";
    if (data.excluded_stocks && data.excluded_stocks.length > 0) {
      data.excluded_stocks.forEach(st => {
        const li = document.createElement("li");
        li.innerHTML = `<strong>${st.name}</strong><span>排除原因: ${st.reason}</span>`;
        excludedStockList.appendChild(li);
      });
    } else {
      excludedStockList.innerHTML = `<li class="text-muted text-center">今日无明确排除标的</li>`;
    }

    watchStockList.innerHTML = "";
    if (data.watch_list && data.watch_list.length > 0) {
      data.watch_list.forEach(st => {
        const li = document.createElement("li");
        li.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <strong style="margin-bottom:0;">${st.name}</strong>
            <span class="badge" style="background:var(--accent-glow); color:var(--accent-color);">${st.direction}</span>
          </div>
          <p style="font-size:12px; color:var(--text-secondary); margin-bottom:4px;">${st.logic}</p>
          <span style="font-size:11px; color:var(--text-muted);"><i class="fa-regular fa-eye"></i> 观察点: ${st.trigger}</span>
        `;
        watchStockList.appendChild(li);
      });
    } else {
      watchStockList.innerHTML = `<li class="text-muted text-center">今日关注池无新增标的</li>`;
    }

    // 3.6 渲染操作总结 (Markdown 渲染)
    if (data.operation_summary) {
      operationSummaryText.innerHTML = marked.parse(data.operation_summary);
    } else {
      operationSummaryText.innerHTML = `<p class="text-muted">今日操作暂无详细指南。</p>`;
    }
  }

  // 股票 Tabs 渲染与切换
  function renderStockTabs(stocks) {
    stockTabs.innerHTML = "";
    if (!stocks || stocks.length === 0) {
      stockDetailContent.innerHTML = `<p class="text-muted text-center">今日无首选标的数据</p>`;
      return;
    }

    stocks.forEach((st, idx) => {
      const btn = document.createElement("button");
      btn.className = `tab-btn ${idx === 0 ? 'active' : ''}`;
      let medalColor = "text-color-yellow";
      if (st.rank === 2) medalColor = "text-muted";
      if (st.rank === 3) medalColor = "text-color-green";

      btn.innerHTML = `<i class="fa-solid fa-trophy ${medalColor}"></i> ${st.name} <span class="badge">${st.code}</span>`;
      btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        renderStockDetail(st);
      });
      stockTabs.appendChild(btn);
    });

    renderStockDetail(stocks[0]);
  }

  // 股票详情页卡渲染
  function renderStockDetail(stock) {
    stockDetailContent.innerHTML = `
      <div class="stock-detail-grid fade-in">
        <div class="stock-main-info">
          <div class="stock-title-row">
            <span class="stock-name-title">${stock.name}</span>
            <span class="stock-code-title">${stock.code}</span>
          </div>
          
          <div class="info-block">
            <h3><i class="fa-solid fa-brain"></i> 战法核心选股逻辑</h3>
            <p>${stock.logic}</p>
          </div>

          <div class="info-block">
            <h3><i class="fa-solid fa-arrow-right-to-bracket text-color-green"></i> 盘中介入条件</h3>
            <p style="background:var(--success-glow); border-color:rgba(16, 185, 129, 0.15); color:var(--text-primary); font-weight:500;">
              ${stock.price_condition}
            </p>
          </div>
        </div>

        <div class="stock-side-stats">
          <div class="score-dashboard">
            <div class="score-circle">
              <span class="score-number">${stock.score}</span>
            </div>
            <span class="score-label">战法综合评分</span>
          </div>

          <table class="mini-stats-table">
            <tbody>
              <tr>
                <td><i class="fa-solid fa-chart-area text-muted"></i> K线筹码特征</td>
                <td>${stock.k_features}</td>
              </tr>
              <tr>
                <td><i class="fa-solid fa-scale-balanced text-muted"></i> 流通市值</td>
                <td>${stock.market_cap}</td>
              </tr>
              <tr>
                <td><i class="fa-solid fa-arrow-trend-up text-muted"></i> 近 5 日表现</td>
                <td>${stock.pct_change_5d}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function showEmptyState() {
    mainContent.style.display = "none";
    emptyState.style.display = "flex";
  }
});
