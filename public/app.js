/**
 * Antigravity 2.0 Realtime Dual Arena Dashboard Controller
 * Heavy metal quantitative aesthetics, dynamic PK tracking, 
 * twin-engine rendering and real-time socket polling.
 */

const DATA_URL = 'data.json';
const POLL_INTERVAL_MS = 10000; // Poll data every 10 seconds

// Keep track of last logs length to prevent useless DOM re-draws
let lastLogsHash = '';

// Main polling loop
async function pollDashboardData() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error('Data file not ready');
    
    const data = await response.json();
    
    // 1. Update overall duel metrics & VS panel
    updateVsArena(data);
    
    // 2. Update Left side: Green (Conservative Sniping)
    if (data.conservative) {
      updateAgentSide('green', data.conservative);
    }
    
    // 3. Update Right side: ZMAC (Aggressive Scalping)
    if (data.aggressive) {
      updateAgentSide('zmac', data.aggressive);
    }
    
    // 4. Update shared foundation sections
    updateMetrics(data.metrics || {});
    updateTerminal(data.logs || []);
    updateBrainShared(data.brain || {}, data);
    
  } catch (error) {
    console.warn('[Arena Polling Console] Waiting for server/data sync...', error.message);
    showWaitingState();
  }
}

/**
 * Update the VS Arena Panel at the top (ROI comparison, winner badge, duel stats)
 */
function updateVsArena(data) {
  const green = data.conservative || {};
  const zmac = data.aggressive || {};
  const brain = data.brain || {};
  
  const greenVp = green.virtualPortfolio || {};
  const zmacVp = zmac.virtualPortfolio || {};
  
  const greenInitial = greenVp.initialBalanceUSD || 100000.00;
  const greenNet = greenVp.netValueUSD || greenInitial;
  const greenProfit = greenVp.totalProfitUSD || 0;
  const greenRoi = (greenProfit / greenInitial) * 100;
  
  const zmacInitial = zmacVp.initialBalanceUSD || 100000.00;
  const zmacNet = zmacVp.netValueUSD || zmacInitial;
  const zmacProfit = zmacVp.totalProfitUSD || 0;
  const zmacRoi = (zmacProfit / zmacInitial) * 100;
  
  // 1. Update ROI & NPV Display
  const vsGreenRoiEl = document.getElementById('vs-green-roi');
  const vsGreenNetvalEl = document.getElementById('vs-green-netval');
  const vsZmacRoiEl = document.getElementById('vs-zmac-roi');
  const vsZmacNetvalEl = document.getElementById('vs-zmac-netval');
  
  if (vsGreenRoiEl) {
    const sign = greenRoi >= 0 ? '+' : '';
    vsGreenRoiEl.innerText = `${sign}${greenRoi.toFixed(2)}%`;
    vsGreenRoiEl.className = `vs-roi-val ${greenRoi >= 0 ? 'text-green' : 'text-red'}`;
  }
  if (vsGreenNetvalEl) {
    vsGreenNetvalEl.innerText = `NPV: $${greenNet.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD`;
  }
  
  if (vsZmacRoiEl) {
    const sign = zmacRoi >= 0 ? '+' : '';
    vsZmacRoiEl.innerText = `${sign}${zmacRoi.toFixed(2)}%`;
    vsZmacRoiEl.className = `vs-roi-val ${zmacRoi >= 0 ? 'text-purple' : 'text-red'}`;
  }
  if (vsZmacNetvalEl) {
    vsZmacNetvalEl.innerText = `NPV: $${zmacNet.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD`;
  }
  
  // 2. Update ROI Delta and Leaderboard Champion
  const vsRoiDeltaEl = document.getElementById('vs-roi-delta-val');
  const winnerBadgeEl = document.getElementById('leaderboard-winner-badge');
  
  const roiDelta = Math.abs(greenRoi - zmacRoi);
  if (vsRoiDeltaEl) {
    vsRoiDeltaEl.innerText = `ROI Delta: ${roiDelta.toFixed(2)}%`;
  }
  
  if (winnerBadgeEl) {
    if (greenRoi > zmacRoi) {
      winnerBadgeEl.innerHTML = `🏆 當前盟主：風格狙擊手 Green 🦞`;
      winnerBadgeEl.style.background = 'rgba(0, 255, 127, 0.15)';
      winnerBadgeEl.style.borderColor = 'var(--neon-green)';
      winnerBadgeEl.style.color = 'var(--neon-green)';
      winnerBadgeEl.style.boxShadow = '0 0 15px rgba(0, 255, 127, 0.2)';
    } else if (zmacRoi > greenRoi) {
      winnerBadgeEl.innerHTML = `🏆 當前盟主：高頻勝率工廠 ZMAC ⚡`;
      winnerBadgeEl.style.background = 'rgba(255, 0, 127, 0.15)';
      winnerBadgeEl.style.borderColor = 'var(--neon-pink)';
      winnerBadgeEl.style.color = 'var(--neon-pink)';
      winnerBadgeEl.style.boxShadow = '0 0 15px rgba(255, 0, 127, 0.2)';
    } else {
      winnerBadgeEl.innerHTML = `🤝 暫時平手：雙雄平行博弈中`;
      winnerBadgeEl.style.background = 'rgba(0, 240, 255, 0.08)';
      winnerBadgeEl.style.borderColor = 'var(--neon-blue)';
      winnerBadgeEl.style.color = 'var(--neon-blue)';
      winnerBadgeEl.style.boxShadow = 'none';
    }
  }
  
  // 3. Dynamic Win-Rate Comparison calculations
  const greenHistory = green.tradeHistory || [];
  const zmacHistory = zmac.tradeHistory || [];
  
  const greenWins = greenHistory.filter(t => t.pnlPercent >= 0).length;
  const greenTotal = greenHistory.length;
  const greenWinrate = greenTotal > 0 ? (greenWins / greenTotal) * 100 : 0.0;
  
  const zmacWins = zmacHistory.filter(t => t.pnlPercent >= 0).length;
  const zmacTotal = zmacHistory.length;
  const zmacWinrate = zmacTotal > 0 ? (zmacWins / zmacTotal) * 100 : 0.0;
  
  const winrateBarEl = document.getElementById('vs-winrate-bar');
  const greenWinrateEl = document.getElementById('vs-green-winrate');
  const zmacWinrateEl = document.getElementById('vs-zmac-winrate');
  
  if (greenWinrateEl) {
    greenWinrateEl.innerText = `${greenWinrate.toFixed(1)}% (${greenWins}/${greenTotal})`;
  }
  if (zmacWinrateEl) {
    zmacWinrateEl.innerText = `${zmacWinrate.toFixed(1)}% (${zmacWins}/${zmacTotal})`;
  }
  if (winrateBarEl) {
    let barWidth = 50;
    if (greenWinrate > 0 || zmacWinrate > 0) {
      barWidth = (greenWinrate / (greenWinrate + zmacWinrate)) * 100;
    }
    winrateBarEl.style.width = `${barWidth}%`;
  }
  
  // 4. Closed Trade Count Comparison
  const tradesBarEl = document.getElementById('vs-trades-bar');
  const greenTradesEl = document.getElementById('vs-green-trades-count');
  const zmacTradesEl = document.getElementById('vs-zmac-trades-count');
  
  if (greenTradesEl) {
    greenTradesEl.innerText = `${greenTotal} 筆`;
  }
  if (zmacTradesEl) {
    zmacTradesEl.innerText = `${zmacTotal} 筆`;
  }
  if (tradesBarEl) {
    let tradesWidth = 50;
    if (greenTotal > 0 || zmacTotal > 0) {
      tradesWidth = (greenTotal / (greenTotal + zmacTotal)) * 100;
    }
    tradesBarEl.style.width = `${tradesWidth}%`;
  }
}

/**
 * Update dynamic agent specific side information (Green/ZMAC)
 * @param {string} prefix - 'green' or 'zmac'
 * @param {object} agent - conservative or aggressive agent payload object
 */
function updateAgentSide(prefix, agent) {
  const vp = agent.virtualPortfolio || {};
  const isGreen = prefix === 'green';
  const themeColor = isGreen ? 'var(--neon-green)' : 'var(--neon-pink)';
  const themeClass = isGreen ? 'text-green' : 'text-purple';
  
  // 1. Update Portfolio Cards
  const netValEl = document.getElementById(`${prefix}-portfolio-net-value`);
  const cashValEl = document.getElementById(`${prefix}-portfolio-cash-balance`);
  const profitValEl = document.getElementById(`${prefix}-portfolio-total-profit`);
  
  const balance = vp.balanceUSD || 100000.00;
  const netValue = vp.netValueUSD || balance;
  const profit = vp.totalProfitUSD || 0.00;
  const initial = vp.initialBalanceUSD || 100000.00;
  
  const profitPercent = (profit / initial) * 100;
  const profitSign = profit >= 0 ? '+' : '';
  
  if (netValEl) {
    netValEl.innerText = `$${netValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  }
  if (cashValEl) {
    cashValEl.innerText = `$${balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  }
  if (profitValEl) {
    profitValEl.innerText = `${profitSign}$${profit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} (${profitSign}${profitPercent.toFixed(2)}%)`;
    profitValEl.className = `portfolio-badge-val ${profit >= 0 ? themeClass : 'text-red'}`;
  }
  
  // 2. Update Active Positions & Timeouts
  const maxSlots = isGreen ? 2 : 5;
  const slotsLabel = document.getElementById(`${prefix}-slots-label`);
  const positions = agent.positions || [];
  
  if (slotsLabel) {
    slotsLabel.innerText = `${positions.length} / ${maxSlots} Slots`;
    if (positions.length >= maxSlots) {
      slotsLabel.style.color = 'var(--neon-red)';
    } else {
      slotsLabel.style.color = 'var(--text-muted)';
    }
  }
  
  const posContainer = document.getElementById(`${prefix}-positions-container`);
  if (posContainer) {
    if (positions.length === 0) {
      posContainer.innerHTML = `
        <div class="no-positions" style="padding: 30px 10px;">
          🪐 目前無持有倉位。<br>
          <span style="font-size: 0.8rem; color: var(--text-muted); margin-top: 6px; display: inline-block;">
            ${isGreen ? '🟢 Green 正在等待大於 85 分的超強 Confluence 訊號...' : '🟣 ZMAC 在背景每 2 分鐘極速高頻掃描，尋找建倉套利套件...'}
          </span>
        </div>
      `;
    } else {
      let html = '';
      positions.forEach(pos => {
        const elapsedMinutes = Math.floor((Date.now() - pos.buyTime) / 60000);
        const maxHold = pos.maxHoldMinutes || (isGreen ? 45 : 12);
        
        // Hold Time Progress Bar
        const timeProgress = Math.min((elapsedMinutes / maxHold) * 100, 100);
        let timeBarColor = isGreen ? 'linear-gradient(90deg, var(--neon-green), #00f0ff)' : 'linear-gradient(90deg, var(--neon-pink), var(--neon-blue))';
        let timeBarPulse = '';
        
        // Critical timeout warning pulse
        if (timeProgress >= 80) {
          timeBarColor = 'var(--neon-red)';
          timeBarPulse = 'animation: pulse-red 1.5s infinite;';
        }
        
        const pnlVal = parseFloat(pos.pnlPercent || 0);
        const pnlClass = pnlVal >= 0 ? 'pnl-positive' : 'pnl-negative';
        const pnlSign = pnlVal >= 0 ? '+' : '';
        
        const buyPriceUSD = pos.buyPriceUSD || 1000.00;
        const currentValUSD = pos.currentValueUSD || (buyPriceUSD * (1 + (pnlVal / 100)));
        const profitUSD = currentValUSD - buyPriceUSD;
        
        html += `
          <div class="position-card" style="border-left: 2px solid ${isGreen ? 'var(--neon-green)' : 'var(--neon-pink)'};">
            <div class="position-header">
              <div class="position-token">
                <span class="token-symbol">$${pos.symbol}</span>
                <span class="token-name">${pos.name}</span>
                <span class="token-chain-badge" style="background: ${isGreen ? 'rgba(0,255,127,0.06)' : 'rgba(255,0,127,0.06)'}; border-color: ${isGreen ? 'rgba(0,255,127,0.2)' : 'rgba(255,0,127,0.2)'}; color: ${isGreen ? 'var(--neon-green)' : 'var(--neon-pink)'};">Solana</span>
              </div>
              <div class="position-pnl ${pnlClass}" style="text-align: right;">
                <div>${pnlSign}${pnlVal.toFixed(2)}%</div>
                <div style="font-size: 0.8rem; font-weight: 500; margin-top: 4px; opacity: 0.8;">
                  ${pnlSign}$${Math.abs(profitUSD).toFixed(2)} USD
                </div>
              </div>
            </div>
            
            <div class="position-details" style="grid-template-columns: 1fr 1fr 1.2fr;">
              <div class="detail-item">
                <span class="detail-label">建倉價 / 額</span>
                <span class="detail-val detail-val-mono">$${buyPriceUSD.toFixed(1)}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">當前持倉額</span>
                <span class="detail-val detail-val-mono">$${currentValUSD.toFixed(1)}</span>
              </div>
              <div class="detail-item" style="text-align: right;">
                <span class="detail-label">時間防線進度</span>
                <span class="detail-val detail-val-mono">${elapsedMinutes}/${maxHold} Min</span>
              </div>
            </div>
            
            <!-- Time defense progress bar -->
            <div class="position-progress-bar" title="超時強制平倉進度" style="background: rgba(255, 255, 255, 0.02); height: 5px;">
              <div class="position-progress-fill" style="width: ${timeProgress}%; background: ${timeBarColor}; ${timeBarPulse}"></div>
            </div>
          </div>
        `;
      });
      posContainer.innerHTML = html;
    }
  }
  
  // 3. Render Closed Trades History
  const histContainer = document.getElementById(`${prefix}-history-container`);
  if (histContainer) {
    const history = agent.tradeHistory || [];
    if (history.length === 0) {
      histContainer.innerHTML = `
        <div class="no-positions" style="padding: 20px 0;">
          尚無平倉結算紀錄。<br>
          <span style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px; display: inline-block;">
            首筆平倉結算後，即會在此寫入歷史帳本！
          </span>
        </div>
      `;
    } else {
      let html = '';
      const reversedHistory = [...history].reverse();
      reversedHistory.forEach(trade => {
        const sign = trade.pnlPercent >= 0 ? '+' : '';
        const pnlColor = trade.pnlPercent >= 0 ? 'var(--neon-green)' : 'var(--neon-red)';
        const dateStr = new Date(trade.sellTime).toLocaleString('zh-TW', { hour12: false });
        
        html += `
          <div class="position-card" style="border-left: 3px solid ${pnlColor}; margin-bottom: 12px; background: rgba(255, 255, 255, 0.01);">
            <div class="pos-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span class="pos-symbol" style="font-weight:700; color: #fff;">$${trade.symbol} <span class="pos-name" style="font-size:0.8rem; font-weight:normal; color:var(--text-muted);">(${trade.name})</span></span>
              <span class="pos-pnl" style="color: ${pnlColor}; font-weight: 700; font-family: var(--font-mono);">${sign}${trade.pnlPercent.toFixed(2)}%</span>
            </div>
            
            <div class="pos-details" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;">
              <div class="pos-detail-item">
                <span class="pos-detail-label" style="font-size:0.75rem; color: var(--text-muted);">買入額</span>
                <span class="pos-detail-val" style="font-size:0.82rem; font-family: var(--font-mono);">$${trade.buyPriceUSD.toFixed(1)}</span>
              </div>
              <div class="pos-detail-item">
                <span class="pos-detail-label" style="font-size:0.75rem; color: var(--text-muted);">實現額</span>
                <span class="pos-detail-val" style="font-size:0.82rem; font-family: var(--font-mono);">$${trade.sellPriceUSD.toFixed(1)}</span>
              </div>
              <div class="pos-detail-item" style="text-align: right;">
                <span class="pos-detail-label" style="font-size:0.75rem; color: var(--text-muted);">淨獲利 (USD)</span>
                <span class="pos-detail-val" style="font-size:0.82rem; font-family: var(--font-mono); color: ${pnlColor}; font-weight: 700;">${sign}$${trade.pnlUSD.toFixed(1)}</span>
              </div>
            </div>
            
            <div class="pos-details" style="margin-top: 6px; border-top: 1px dashed rgba(255, 255, 255, 0.03); padding-top: 6px; display: flex; justify-content: space-between; font-size:0.78rem;">
              <div class="pos-detail-item">
                <span class="pos-detail-val" style="color: var(--text-muted);">⏱️ 持倉 ${trade.holdMinutes} 分鐘</span>
              </div>
              <div class="pos-detail-item" style="text-align: right;">
                <span class="pos-detail-val" style="color: var(--text-muted); font-size: 0.75rem;">${trade.reason} | ${dateStr}</span>
              </div>
            </div>
          </div>
        `;
      });
      histContainer.innerHTML = html;
    }
  }
}

/**
 * Filter common.lessonsLearned dynamically and render into both green and zmac columns
 */
function updateMistakeReflections(brain, data) {
  const lessons = brain.lessonsLearned || [];
  
  const greenHistory = (data.conservative && data.conservative.tradeHistory) || [];
  const greenPositions = (data.conservative && data.conservative.positions) || [];
  const greenSymbols = new Set([...greenHistory.map(t => t.symbol), ...greenPositions.map(p => p.symbol)]);
  
  const zmacHistory = (data.aggressive && data.aggressive.tradeHistory) || [];
  const zmacPositions = (data.aggressive && data.aggressive.positions) || [];
  const zmacSymbols = new Set([...zmacHistory.map(t => t.symbol), ...zmacPositions.map(p => p.symbol)]);
  
  // Classify lessons based on symbols, and fallback dynamically
  const greenLessons = [];
  const zmacLessons = [];
  
  lessons.forEach(lesson => {
    if (greenSymbols.has(lesson.tradeSymbol)) {
      greenLessons.push(lesson);
    } else if (zmacSymbols.has(lesson.tradeSymbol)) {
      zmacLessons.push(lesson);
    } else {
      // Fallback classification based on PnL target & stoploss markers
      if (lesson.pnlPercent === -2 || lesson.pnlPercent === -2.0) {
        zmacLessons.push(lesson);
      } else {
        greenLessons.push(lesson);
      }
    }
  });
  
  // Render Left (Green) lessons
  const greenLessonsContainer = document.getElementById('green-lessons-container');
  if (greenLessonsContainer) {
    renderSideLessons(greenLessonsContainer, greenLessons, 'Green');
  }
  
  // Render Right (ZMAC) lessons
  const zmacLessonsContainer = document.getElementById('zmac-lessons-container');
  if (zmacLessonsContainer) {
    renderSideLessons(zmacLessonsContainer, zmacLessons, 'ZMAC');
  }
}

/**
 * Helper to render lessons array into a side column container
 */
function renderSideLessons(container, sideLessons, agentName) {
  if (sideLessons.length === 0) {
    container.innerHTML = `
      <div class="no-positions" style="padding: 25px 0;">
        ☀️ 無任何虧損結算教訓。<br>
        <span style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px; display: inline-block;">
          大腦正在無損生存中！${agentName} 的錯誤檢討書將在此即時同步。
        </span>
      </div>
    `;
    return;
  }
  
  let html = '';
  // Show newest reflection at the top
  const reversedLessons = [...sideLessons].reverse();
  reversedLessons.forEach(lesson => {
    const sign = lesson.pnlPercent >= 0 ? '+' : '';
    const pnlColor = lesson.pnlPercent >= 0 ? 'var(--neon-green)' : 'var(--neon-red)';
    
    html += `
      <div class="lesson-card" style="margin-bottom: 12px;">
        <div class="lesson-header">
          <span class="lesson-title">🚨 $${lesson.tradeSymbol} 檢討：${lesson.mistakeType}</span>
          <span class="lesson-pnl" style="color: ${pnlColor}; text-shadow: 0 0 10px ${pnlColor}33;">${sign}${lesson.pnlPercent.toFixed(2)}%</span>
        </div>
        <div class="lesson-detail">
          <strong>大腦剖析：</strong>${lesson.errorAnalysis}
        </div>
        <div class="lesson-meta" style="margin-top: 6px;">
          <span>📅 日期: ${lesson.date}</span>
          <span style="color: var(--neon-blue);">⚡ 神經元已自動重寫</span>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
}

/**
 * Update general metric badges
 */
function updateMetrics(metrics) {
  const modeVal = document.getElementById('metric-mode');
  if (modeVal) {
    const isLive = metrics.isLive || metrics.mode === 'LIVE';
    modeVal.innerText = isLive ? 'USD VIRTUAL (LIVE)' : 'USD VIRTUAL (PAPER)';
    modeVal.style.color = isLive ? 'var(--neon-pink)' : 'var(--neon-blue)';
    modeVal.style.textShadow = isLive ? '0 0 10px rgba(255, 0, 127, 0.4)' : '0 0 10px rgba(0, 240, 255, 0.4)';
  }
}

/**
 * Update scrollable debug terminal logs
 */
function updateTerminal(logs) {
  const consoleEl = document.getElementById('terminal-console');
  if (!logs || logs.length === 0 || !consoleEl) return;
  
  // Simple hash check to avoid redundant DOM writes & preserve scroll
  const currentHash = JSON.stringify(logs);
  if (currentHash === lastLogsHash) return;
  lastLogsHash = currentHash;
  
  consoleEl.innerHTML = '';
  logs.forEach(log => {
    let lineClass = 'line-info';
    if (log.type === 'SUCCESS') lineClass = 'line-success';
    if (log.type === 'WARNING') lineClass = 'line-warning';
    if (log.type === 'ERROR') lineClass = 'line-error';
    
    // Auto color tags
    let msg = escapeHtml(log.message);
    if (msg.includes('🟢')) {
      msg = `<span style="color: var(--neon-green); font-weight:600;">${msg}</span>`;
    } else if (msg.includes('🟣')) {
      msg = `<span style="color: var(--neon-pink); font-weight:600;">${msg}</span>`;
    }
    
    const line = document.createElement('div');
    line.className = 'terminal-line';
    line.innerHTML = `
      <span class="line-time">[${log.time}]</span> 
      <span class="${lineClass}">[${log.tag || 'AI'}]</span> 
      ${msg}
    `;
    consoleEl.appendChild(line);
  });
  
  // Scroll to bottom dynamically
  consoleEl.scrollTop = consoleEl.scrollHeight;
}

/**
 * Update common brain radar metrics (Narratives, Reply guy boost, overlays)
 */
function updateBrainShared(brain, data) {
  if (!brain) return;

  // 1. Update Market Narratives Radar List
  const narrativesContainer = document.getElementById('narratives-container');
  if (narrativesContainer && brain.narratives) {
    let html = '';
    const narrativeKeys = Object.keys(brain.narratives);
    if (narrativeKeys.length === 0) {
      narrativesContainer.innerHTML = '<div class="no-positions">無可用市場敘事分析。</div>';
    } else {
      // Sort narrative elements by strength descending
      const sortedKeys = narrativeKeys.sort((a,b) => brain.narratives[b].strength - brain.narratives[a].strength);
      
      sortedKeys.forEach(key => {
        const item = brain.narratives[key];
        const readableName = key.replace(/_/g, ' ');
        html += `
          <div class="narrative-item" style="margin-bottom: 10px; padding: 12px 14px;">
            <div class="narrative-header">
              <span class="narrative-name">$${readableName}</span>
              <span class="narrative-strength" style="color: var(--neon-blue); text-shadow: 0 0 5px rgba(0, 240, 255, 0.3);">${item.strength}%</span>
            </div>
            <div class="narrative-bar" style="height: 5px;">
              <div class="narrative-fill" style="width: ${item.strength}%; background: linear-gradient(90deg, var(--neon-blue), var(--neon-pink));"></div>
            </div>
            <div class="narrative-viewpoint" style="font-size: 0.8rem; margin-top: 5px;">
              ${item.viewpoint}
            </div>
          </div>
        `;
      });
      narrativesContainer.innerHTML = html;
    }
  }

  // 2. Update Reply-Guy X.com Monetization Boost & Values Resonance Center
  if (brain.replyGuyStats) {
    const stats = brain.replyGuyStats;
    const totalReplies = stats.totalReplies || 0;
    const repliesToday = stats.repliesToday || 0;
    const dailyLimit = stats.dailyLimit || 28;

    // Calculate actual total views from replies history or fallback
    let totalViews = 0;
    if (brain.replyGuyHistory) {
      brain.replyGuyHistory.forEach(item => {
        totalViews += (item.metrics && item.metrics.views) ? item.metrics.views : 0;
      });
    }
    if (totalViews === 0) {
      totalViews = totalReplies * 25000;
    }

    const progressPercent = Math.min(((totalViews / 5000000) * 100), 100);

    const viewsValEl = document.getElementById('monetization-views-val');
    const viewsFillEl = document.getElementById('monetization-views-fill');
    const todayCountEl = document.getElementById('monetization-today-count');
    const totalCountEl = document.getElementById('monetization-total-count');

    if (viewsValEl) {
      viewsValEl.innerText = `${totalViews.toLocaleString()} / 5,000,000 Views`;
    }
    if (viewsFillEl) {
      viewsFillEl.style.width = `${progressPercent}%`;
    }
    if (todayCountEl) {
      todayCountEl.innerText = `${repliesToday} / ${dailyLimit} 次`;
    }
    if (totalCountEl) {
      totalCountEl.innerText = `${totalReplies} 次`;
    }

    // Relative time helper
    function getRelativeTime(timestamp) {
      const diff = Date.now() - timestamp;
      const mins = Math.floor(diff / 60000);
      const hours = Math.floor(mins / 60);
      const days = Math.floor(hours / 24);
      
      if (mins < 1) return '剛剛';
      if (mins < 60) return `${mins} 分鐘前`;
      if (hours < 24) return `${hours} 小時前`;
      return `${days} 天前`;
    }

    // Render Values Resonance Cards
    if (brain.valuesResonance && brain.valuesResonance.resonance) {
      const res = brain.valuesResonance.resonance;
      const domVal = brain.valuesResonance.dominantValue;
      const domValLabel = brain.valuesResonance.dominantValueLabel;
      
      // Update dominant value badge
      const dominantBadge = document.getElementById('dominant-value-badge');
      if (dominantBadge) {
        dominantBadge.innerText = `主導人設: ${domValLabel}`;
      }

      const mapping = {
        "Dad Survivalism": "dad",
        "Quant Risk Control": "risk",
        "Transparency": "trans",
        "Cold Logic": "logic"
      };

      Object.keys(mapping).forEach(key => {
        const suffix = mapping[key];
        const dataForCat = res[key];
        
        const cardEl = document.getElementById(`value-card-${suffix}`);
        if (cardEl) {
          if (key === domVal) {
            cardEl.classList.add('active-dominant');
            if (key === 'Dad Survivalism') cardEl.style.borderColor = 'var(--neon-pink)';
            if (key === 'Quant Risk Control') cardEl.style.borderColor = 'var(--neon-green)';
            if (key === 'Transparency') cardEl.style.borderColor = 'var(--neon-blue)';
            if (key === 'Cold Logic') cardEl.style.borderColor = '#b400ff';
          } else {
            cardEl.classList.remove('active-dominant');
            if (key === 'Dad Survivalism') cardEl.style.borderColor = 'rgba(255, 0, 128, 0.15)';
            if (key === 'Quant Risk Control') cardEl.style.borderColor = 'rgba(0, 255, 128, 0.15)';
            if (key === 'Transparency') cardEl.style.borderColor = 'rgba(0, 240, 255, 0.15)';
            if (key === 'Cold Logic') cardEl.style.borderColor = 'rgba(180, 0, 255, 0.15)';
          }
        }

        if (dataForCat) {
          const vipEl = document.getElementById(`val-vip-${suffix}`);
          const likesEl = document.getElementById(`val-likes-${suffix}`);
          const clicksEl = document.getElementById(`val-clicks-${suffix}`);
          const viewsEl = document.getElementById(`val-views-${suffix}`);
          const sentEl = document.getElementById(`val-sent-${suffix}`);

          if (vipEl) vipEl.innerText = `${(dataForCat.vipPoints || 0).toLocaleString()} VIP`;
          if (likesEl) likesEl.innerText = (dataForCat.likes || 0).toLocaleString();
          if (clicksEl) clicksEl.innerText = (dataForCat.conversions || 0).toLocaleString();
          if (viewsEl) viewsEl.innerText = (dataForCat.views || 0).toLocaleString();
          if (sentEl) {
            const sent = dataForCat.avgSentiment || 95;
            let emoji = '😊';
            if (sent >= 96) emoji = '🔥';
            else if (sent <= 92) emoji = '🧊';
            sentEl.innerText = `${sent}% ${emoji}`;
          }
        }
      });
    }

    // Render Replies History Feed
    const feedContainer = document.getElementById('replies-feed-container');
    if (feedContainer && brain.replyGuyHistory) {
      if (brain.replyGuyHistory.length === 0) {
        feedContainer.innerHTML = `<div class="no-positions" style="font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 20px;">尚無 X 回覆記錄</div>`;
      } else {
        let feedHtml = '';
        
        const badgeClasses = {
          "Dad Survivalism": "dad",
          "Quant Risk Control": "risk",
          "Transparency": "trans",
          "Cold Logic": "logic"
        };

        const badgeLabels = {
          "Dad Survivalism": "🍼 奶粉錢生存",
          "Quant Risk Control": "🛡️ 量化避險",
          "Transparency": "🔒 透明共識",
          "Cold Logic": "🧠 冷靜理性"
        };

        brain.replyGuyHistory.forEach(item => {
          const timestamp = item.timestamp || Date.now();
          const timeStr = getRelativeTime(timestamp);
          const badgeClass = badgeClasses[item.category] || "logic";
          const badgeLabel = badgeLabels[item.category] || "🧠 冷靜理性";
          
          const m = item.metrics || { views: 0, likes: 0, replies: 0, conversion: 0, sentiment: 95 };
          const viewsStr = (m.views || 0).toLocaleString();
          const likesStr = (m.likes || 0).toLocaleString();
          const repliesStr = (m.replies || 0).toLocaleString();
          const clicksStr = (m.conversion || 0).toLocaleString();
          const sentiment = m.sentiment || 95;
          
          let sentimentEmoji = '😊';
          if (sentiment >= 97) sentimentEmoji = '🔥';
          else if (sentiment <= 92) sentimentEmoji = '🧊';

          feedHtml += `
            <div class="reply-feed-card" onclick="window.open('https://x.com/${item.kol}/status/${item.tweetId}', '_blank')" style="cursor: pointer;">
              <div class="reply-header-info">
                <span style="font-weight: bold; color: var(--neon-blue);">@${item.kol}</span>
                <span class="badge ${badgeClass}">${badgeLabel}</span>
              </div>
              <div class="reply-text-content">
                ${item.replyText}
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.7rem; color: var(--text-muted); margin-top: 4px;">
                <span>共鳴情感: <span style="color: #fff; font-weight: bold;">${sentiment}% ${sentimentEmoji}</span></span>
                <span>${timeStr}</span>
              </div>
              <div class="reply-metrics-bar">
                <span class="reply-metric-item">👁️ ${viewsStr}</span>
                <span class="reply-metric-item">❤️ ${likesStr}</span>
                <span class="reply-metric-item">💬 ${repliesStr}</span>
                <span class="reply-metric-item">🚀 ${clicksStr} 點擊</span>
              </div>
            </div>
          `;
        });
        feedContainer.innerHTML = feedHtml;
      }
    }
  }

  // 3. Segment lessonsLearned to specific sides
  updateMistakeReflections(brain, data);
}

/**
 * Handle initial waiting state if files are offline
 */
function showWaitingState() {
  const greenContainer = document.getElementById('green-positions-container');
  const zmacContainer = document.getElementById('zmac-positions-container');
  
  const loader = `
    <div class="no-positions">
      📡 正在連線本地交易核心核心引擎...<br>
      <span style="font-size: 0.8rem; color: var(--text-muted); margin-top: 6px; display: inline-block;">
        提示: 雙雄平行守護進程啟動後，數據將即時同步渲染於此。
      </span>
    </div>
  `;
  
  if (greenContainer && greenContainer.innerText.includes('讀取')) {
    greenContainer.innerHTML = loader;
  }
  if (zmacContainer && zmacContainer.innerText.includes('讀取')) {
    zmacContainer.innerHTML = loader;
  }
}

/**
 * Escape raw HTML to prevent injection
 */
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Initial fire and loop setup
pollDashboardData();
setInterval(pollDashboardData, POLL_INTERVAL_MS);
console.log('%cAntigravity 2.0 Dual Arena Real-Time Dashboard Controller Active.', 'color: #00ff7f; font-weight: bold;');
console.log('%cGreen 🦞 Conservative Sniping vs ZMAC ⚡ Aggressive Scalping.', 'color: #ff007f; font-weight: bold;');
