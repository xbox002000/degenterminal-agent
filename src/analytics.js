const fs = require('fs');
const path = require('path');

/**
 * ProfitEngine Analytics Module
 * Computes core quantitative performance metrics from trade history.
 */
class Analytics {
  constructor() {
    this.historyPath = path.join(__dirname, '../config/trade_history.json');
  }

  /**
   * Load all closed trades
   */
  loadHistory() {
    try {
      if (fs.existsSync(this.historyPath)) {
        return JSON.parse(fs.readFileSync(this.historyPath, 'utf8'));
      }
    } catch (e) {
      console.error('[Analytics] Failed to load trade history:', e.message);
    }
    return [];
  }

  /**
   * Compute core performance metrics
   */
  computeMetrics() {
    const trades = this.loadHistory();
    if (trades.length === 0) {
      return {
        totalTrades: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        totalPnlUSD: 0,
        avgPnlUSD: 0,
        bestTradeUSD: 0,
        worstTradeUSD: 0,
        avgHoldMinutes: 0,
        profitFactor: 0,
        maxConsecutiveLosses: 0
      };
    }

    let wins = 0, losses = 0;
    let totalPnlUSD = 0;
    let totalGainUSD = 0, totalLossUSD = 0;
    let bestTradeUSD = -Infinity, worstTradeUSD = Infinity;
    let totalHoldMinutes = 0;
    let consecutiveLosses = 0, maxConsecutiveLosses = 0;

    for (const trade of trades) {
      const pnl = trade.pnlUSD || 0;
      totalPnlUSD += pnl;
      totalHoldMinutes += (trade.holdMinutes || 0);

      if (pnl >= 0) {
        wins++;
        totalGainUSD += pnl;
        consecutiveLosses = 0;
      } else {
        losses++;
        totalLossUSD += Math.abs(pnl);
        consecutiveLosses++;
        maxConsecutiveLosses = Math.max(maxConsecutiveLosses, consecutiveLosses);
      }

      bestTradeUSD = Math.max(bestTradeUSD, pnl);
      worstTradeUSD = Math.min(worstTradeUSD, pnl);
    }

    const totalTrades = trades.length;
    const winRate = totalTrades > 0 ? (wins / totalTrades * 100) : 0;
    const avgPnlUSD = totalTrades > 0 ? totalPnlUSD / totalTrades : 0;
    const avgHoldMinutes = totalTrades > 0 ? totalHoldMinutes / totalTrades : 0;
    const profitFactor = totalLossUSD > 0 ? totalGainUSD / totalLossUSD : (totalGainUSD > 0 ? Infinity : 0);

    return {
      totalTrades,
      wins,
      losses,
      winRate: parseFloat(winRate.toFixed(1)),
      totalPnlUSD: parseFloat(totalPnlUSD.toFixed(2)),
      avgPnlUSD: parseFloat(avgPnlUSD.toFixed(2)),
      bestTradeUSD: bestTradeUSD === -Infinity ? 0 : parseFloat(bestTradeUSD.toFixed(2)),
      worstTradeUSD: worstTradeUSD === Infinity ? 0 : parseFloat(worstTradeUSD.toFixed(2)),
      avgHoldMinutes: parseFloat(avgHoldMinutes.toFixed(1)),
      profitFactor: profitFactor === Infinity ? 999 : parseFloat(profitFactor.toFixed(2)),
      maxConsecutiveLosses
    };
  }

  /**
   * Generate a daily summary tweet text
   */
  generateDailySummaryTweet(virtualPortfolio) {
    const m = this.computeMetrics();
    if (m.totalTrades === 0) return null;

    const balanceStr = virtualPortfolio ? 
      `$${virtualPortfolio.balanceUSD.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD` :
      'N/A';

    const pnlSign = m.totalPnlUSD >= 0 ? '+' : '-';

    return `📊 [DAILY PORTFOLIO SUMMARY]\n` +
           `Trades: ${m.totalTrades} | Win Rate: ${m.winRate}%\n` +
           `Net PnL: ${pnlSign}$${Math.abs(m.totalPnlUSD).toFixed(2)} USD\n` +
           `Best: +$${Math.max(0, m.bestTradeUSD).toFixed(2)} | Worst: -$${Math.abs(Math.min(0, m.worstTradeUSD)).toFixed(2)}\n` +
           `Balance: ${balanceStr}\n` +
           `Silicon never sleeps. 🦞\n\n` +
           `🤖 Tested under the cold logic of Antigravity 2.0 | Silicon-only execution`;
  }
}

module.exports = new Analytics();
