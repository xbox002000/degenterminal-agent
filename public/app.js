/**
 * DegenTerminal 24/7 Realtime Quantitative Dashboard
 * Dynamic data polling & smooth rendering controller.
 */

const DATA_URL = 'data.json';
const POLL_INTERVAL_MS = 10000; // Poll data every 10 seconds

// Main polling loop
async function pollDashboardData() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error('Data file not ready');
    
    const data = await response.json();
    
    // 1. Update Metrics
    updateMetrics(data.metrics || {});
    
    // 2. Update Positions
    updatePositions(data.positions || []);
    
    // 3. Update Terminal Logs
    updateTerminal(data.logs || []);
    
  } catch (error) {
    console.warn('[Dashboard Console] Data fetch pending:', error.message);
    // Render offline/waiting state if file is completely missing
    showWaitingState();
  }
}

/**
 * Update general metric badges
 */
function updateMetrics(metrics) {
  const modeVal = document.getElementById('metric-mode');
  const amountVal = document.getElementById('metric-amount');
  
  if (metrics.mode) {
    modeVal.innerText = `SOL ${metrics.mode}`;
    modeVal.style.color = metrics.mode === 'LIVE' ? 'var(--neon-pink)' : 'var(--neon-blue)';
  }
  if (metrics.amount) {
    amountVal.innerText = `${metrics.amount} SOL`;
  }
}

/**
 * Update positions cards with progress tracking
 */
function updatePositions(positions) {
  const container = document.getElementById('positions-container');
  
  if (!positions || positions.length === 0) {
    container.innerHTML = `
      <div class="no-positions">
        🪐 目前沒有處於持有狀態的倉位。<br>
        <span style="font-size: 0.85rem; color: var(--text-muted); margin-top: 8px; display: inline-block;">
          DegenTerminal 正在背景每 30 分鐘掃描尋找極優的 LOW-Risk 代幣...
        </span>
      </div>
    `;
    return;
  }
  
  let html = '';
  positions.forEach(pos => {
    // Determine real elapsed minutes
    const elapsedMinutes = Math.floor((Date.now() - pos.buyTime) / 60000);
    
    // Determine PnL Ratio & Styling
    const pnlVal = parseFloat(pos.pnlPercent || 0);
    const pnlClass = pnlVal >= 0 ? 'pnl-positive' : 'pnl-negative';
    const pnlSign = pnlVal >= 0 ? '+' : '';
    
    // Calculate profit progress (TP target is +40%)
    const pnlRatio = pnlVal / 100;
    const progressPercent = Math.min(Math.max((pnlRatio / 0.40) * 100, 0), 100);
    
    html += `
      <div class="position-card">
        <div class="position-header">
          <div class="position-token">
            <span class="token-symbol">$${pos.symbol}</span>
            <span class="token-name">${pos.name}</span>
            <span class="token-chain-badge">Solana</span>
          </div>
          <div class="position-pnl ${pnlClass}">
            ${pnlSign}${pnlVal.toFixed(2)}%
          </div>
        </div>
        
        <div class="position-details">
          <div class="detail-item">
            <span class="detail-label">買入SOL額</span>
            <span class="detail-val detail-val-mono">${pos.buyPriceSol} SOL</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">獲得代幣量</span>
            <span class="detail-val detail-val-mono">${(pos.amountOut || 0).toLocaleString()}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">持有時間</span>
            <span class="detail-val detail-val-mono">${elapsedMinutes} / 20 分鐘</span>
          </div>
        </div>
        
        <!-- High-tech profit target progress bar -->
        <div class="position-progress-bar" title="止盈目標 (+40.0%) 進度">
          <div class="position-progress-fill" style="width: ${progressPercent}%; background: ${pnlVal >= 0 ? 'linear-gradient(90deg, var(--neon-blue), var(--neon-green))' : 'var(--neon-red)'}"></div>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

/**
 * Update scrollable terminal logs
 */
let lastLogsHash = '';
function updateTerminal(logs) {
  const consoleEl = document.getElementById('terminal-console');
  if (!logs || logs.length === 0) return;
  
  // Simple hash check to avoid redundant DOM writes
  const currentHash = JSON.stringify(logs);
  if (currentHash === lastLogsHash) return;
  lastLogsHash = currentHash;
  
  consoleEl.innerHTML = '';
  logs.forEach(log => {
    let lineClass = 'line-info';
    if (log.type === 'SUCCESS') lineClass = 'line-success';
    if (log.type === 'WARNING') lineClass = 'line-warning';
    if (log.type === 'ERROR') lineClass = 'line-error';
    
    const line = document.createElement('div');
    line.className = 'terminal-line';
    line.innerHTML = `
      <span class="line-time">[${log.time}]</span> 
      <span class="${lineClass}">[${log.tag || 'AI'}]</span> 
      ${escapeHtml(log.message)}
    `;
    consoleEl.appendChild(line);
  });
  
  // Scroll to bottom dynamically
  consoleEl.scrollTop = consoleEl.scrollHeight;
}

/**
 * Handle initial waiting state if files are offline
 */
function showWaitingState() {
  const container = document.getElementById('positions-container');
  if (container.innerText.includes('正在連線')) {
    container.innerHTML = `
      <div class="no-positions">
        📡 正在等待本地交易引擎寫入數據...<br>
        <span style="font-size: 0.85rem; color: var(--text-muted); margin-top: 8px; display: inline-block;">
          提示: 當背景守護進程第一次執行完畢後，即會在此顯示實時持倉與日誌！
        </span>
      </div>
    `;
  }
}

/**
 * Escape raw HTML to prevent injection
 */
function escapeHtml(text) {
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
console.log('%cDegenTerminal Realtime Dashboard Initialized. Silicon Bidding Active.', 'color: #00f0ff; font-weight: bold;');
