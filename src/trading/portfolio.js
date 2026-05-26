const fs = require('fs');
const path = require('path');

class PortfolioManager {
  constructor(agent) {
    this.agent = agent;
    this.mode = agent.mode;
    this.virtualPortfolio = {
      balanceUSD: 100000.00,
      totalProfitUSD: 0.00,
      initialBalanceUSD: 100000.00
    };
  }

  getPortfolioPath() {
    return path.join(__dirname, `../../config/virtual_portfolio_${this.mode}.json`);
  }

  getPositionsPath() {
    return path.join(__dirname, `../../config/positions_${this.mode}.json`);
  }

  getTradeHistoryPath() {
    return path.join(__dirname, `../../config/trade_history_${this.mode}.json`);
  }

  /**
   * Load Virtual USD Portfolio from dynamic path
   */
  loadVirtualPortfolio() {
    const configDir = path.join(__dirname, '../../config');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    const portfolioPath = this.getPortfolioPath();
    if (!fs.existsSync(portfolioPath)) {
      this.saveVirtualPortfolio();
      return;
    }
    try {
      const data = fs.readFileSync(portfolioPath, 'utf8');
      this.virtualPortfolio = JSON.parse(data);
      
      // --- Auto Calibration with Occupied Capital Subtraction ---
      const historyPath = this.getTradeHistoryPath();
      if (fs.existsSync(historyPath)) {
        try {
          const historyData = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
          let totalPnlUSD = 0;
          historyData.forEach(trade => {
            totalPnlUSD += (trade.pnlUSD || 0);
          });
          
          // Calculate Capital currently locked in Active Positions
          let activePositionsCostUSD = 0;
          const positionsPath = this.getPositionsPath();
          if (fs.existsSync(positionsPath)) {
            const positionsData = JSON.parse(fs.readFileSync(positionsPath, 'utf8'));
            positionsData.forEach(pos => {
              activePositionsCostUSD += (pos.buyPriceUSD || 1000.00);
            });
          }
          
          const initial = this.virtualPortfolio.initialBalanceUSD || 100000.00;

          // Include yield pool locked capital
          let totalYieldLockedUSD = 0;
          try {
            const yieldPath = path.join(__dirname, `../../config/yield_state_${this.mode}.json`);
            if (fs.existsSync(yieldPath)) {
              const config = require('../config');
              const approxSolPrice = config.lastKnownSolPrice || 170;
              const yieldData = JSON.parse(fs.readFileSync(yieldPath, 'utf8'));
              const totalStakedSOL = (yieldData.jitoSolBalance || 0) + (yieldData.kaminoBalance || 0) + (yieldData.driftBalance || 0);
              const principalStakedSOL = Math.max(0, totalStakedSOL - (yieldData.totalAccruedYieldSol || 0));
              totalYieldLockedUSD = principalStakedSOL * approxSolPrice;
            }
          } catch (e) {}

          // Correct cash balance must exclude locked active trading capital AND yield locked capital
          const expectedCashBalance = initial + totalPnlUSD - activePositionsCostUSD - totalYieldLockedUSD;
          
          // If current cash balance in portfolio file is mismatch with actual trading history and occupied capital, calibrate it
          if (Math.abs((this.virtualPortfolio.balanceUSD || 0) - expectedCashBalance) > 5.00) {
            console.log(`💡 [DegenTerminal - ${this.mode.toUpperCase()}] Calibrating portfolio cash balance:`);
            console.log(`   -> Old Cash: $${this.virtualPortfolio.balanceUSD.toFixed(2)} | Calibrated Cash: $${expectedCashBalance.toFixed(2)}`);
            console.log(`   -> Locked in Positions: $${activePositionsCostUSD.toFixed(2)}`);
            
            this.virtualPortfolio.balanceUSD = expectedCashBalance;
            this.virtualPortfolio.totalProfitUSD = totalPnlUSD;
            this.virtualPortfolio.initialBalanceUSD = initial;
            this.saveVirtualPortfolio();
          }
        } catch (calErr) {
          console.warn(`[DegenTerminal - ${this.mode.toUpperCase()}] Portfolio auto-calibration failed:`, calErr.message);
        }
      }
      // -------------------------------------------------

      console.log(`[DegenTerminal - ${this.mode.toUpperCase()}] Loaded virtual USD portfolio. Balance: $${this.virtualPortfolio.balanceUSD.toFixed(2)} USD.`);
    } catch (e) {
      console.error(`[DegenTerminal - ${this.mode.toUpperCase()}] Failed to load virtual portfolio, resetting:`, e.message);
      this.saveVirtualPortfolio();
    }
  }

  /**
   * Force reload virtual portfolio from disk (picks up manual resets)
   */
  reloadVirtualPortfolio() {
    this.loadVirtualPortfolio();
  }

  /**
   * Save Virtual USD Portfolio to dynamic path
   */
  saveVirtualPortfolio() {
    const configDir = path.join(__dirname, '../../config');
    const portfolioPath = this.getPortfolioPath();
    try {
      fs.writeFileSync(portfolioPath, JSON.stringify(this.virtualPortfolio, null, 2), 'utf8');
    } catch (e) {
      console.error(`[DegenTerminal - ${this.mode.toUpperCase()}] Failed to save virtual portfolio:`, e.message);
    }
  }

  /**
   * Load current active trading positions from dynamic path
   */
  loadPositions() {
    const configDir = path.join(__dirname, '../../config');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    const positionsPath = this.getPositionsPath();
    if (!fs.existsSync(positionsPath)) {
      fs.writeFileSync(positionsPath, '[]', 'utf8');
      return [];
    }
    try {
      const data = fs.readFileSync(positionsPath, 'utf8');
      return JSON.parse(data);
    } catch (e) {
      console.error(`[DegenTerminal - ${this.mode}] Error loading positions, resetting database:`, e.message);
      return [];
    }
  }

  /**
   * Save active trading positions to dynamic path
   */
  async savePositions(positions) {
    const configDir = path.join(__dirname, '../../config');
    const positionsPath = this.getPositionsPath();
    try {
      fs.writeFileSync(positionsPath, JSON.stringify(positions, null, 2), 'utf8');
      console.log(`[DegenTerminal - ${this.mode.toUpperCase()}] Saved ${positions.length} active positions to database.`);
    } catch (e) {
      console.error(`[DegenTerminal - ${this.mode}] Failed to save positions:`, e.message);
    }
    if (this.agent && typeof this.agent.updateWebDashboard === 'function') {
      await this.agent.updateWebDashboard(positions);
    }
  }
}

module.exports = PortfolioManager;
