const fs = require('fs');
const path = require('path');
const { Connection, PublicKey } = require('@solana/web3.js');
const config = require('../config');

class YieldManager {
  /**
   * @param {DegenTerminalAgent} agent - The agent instance
   */
  constructor(agent) {
    this.agent = agent;
    this.connection = agent.trader.connection;
    this.wallet = agent.wallet;
    this.trader = agent.trader;
    this.jitoSolMint = 'J1toso2hyaxG2Pn4crfGsjhK4an3CsRJg7tmeMetTCYd';
    
    // Institutional Staking & Yield Strategy APYs
    this.jitoSolApy = 0.075;  // 7.5% APY JitoSOL Staking
    this.kaminoApy = 0.15;    // 15.0% APY Kamino Concentrated LP (Delta-Neutral)
    this.driftApy = 0.22;     // 22.0% APY Drift Funding Rate Arbitrage (Bull Hedged)
  }

  getYieldStatePath() {
    return path.join(__dirname, `../../config/yield_state_${this.agent.mode}.json`);
  }

  /**
   * Load yield state or initialize
   */
  loadYieldState() {
    const yieldPath = this.getYieldStatePath();
    if (!fs.existsSync(yieldPath)) {
      return {
        jitoSolBalance: 0,
        kaminoBalance: 0,
        driftBalance: 0,
        lastAccruedTime: Date.now(),
        totalAccruedYieldSol: 0,
        allocation: { jitoSol: 0.2, kamino: 0.4, drift: 0.4 }
      };
    }
    try {
      const data = fs.readFileSync(yieldPath, 'utf8');
      const state = JSON.parse(data);
      if (state.jitoSolBalance === undefined) state.jitoSolBalance = 0;
      if (state.kaminoBalance === undefined) state.kaminoBalance = 0;
      if (state.driftBalance === undefined) state.driftBalance = 0;
      return state;
    } catch (e) {
      console.warn(`[YieldManager] Error loading yield state:`, e.message);
      return {
        jitoSolBalance: 0,
        kaminoBalance: 0,
        driftBalance: 0,
        lastAccruedTime: Date.now(),
        totalAccruedYieldSol: 0,
        allocation: { jitoSol: 0.2, kamino: 0.4, drift: 0.4 }
      };
    }
  }

  /**
   * Save yield state
   */
  saveYieldState(state) {
    try {
      fs.writeFileSync(this.getYieldStatePath(), JSON.stringify(state, null, 2), 'utf8');
    } catch (e) {
      console.error(`[YieldManager] Failed to save yield state:`, e.message);
    }
  }

  /**
   * Reallocate yield capital dynamically based on FNG Index
   */
  reallocateYieldCapital(state, fngValue = 50) {
    const totalBalance = (state.jitoSolBalance || 0) + (state.kaminoBalance || 0) + (state.driftBalance || 0);
    if (totalBalance <= 0) return;

    let jitoPct = 0.20;
    let kaminoPct = 0.40;
    let driftPct = 0.40;

    if (fngValue > 75) {
      // 🚀 Extreme Greed: Multi-Strategy Aggressive Profit (Drift 60%, Kamino 30%, JitoSOL 10%)
      jitoPct = 0.10;
      kaminoPct = 0.30;
      driftPct = 0.60;
    } else if (fngValue < 35) {
      // 🛡️ Fear: Multi-Strategy Capital Preservation (JitoSOL 40%, Kamino 40%, Drift 20%)
      jitoPct = 0.40;
      kaminoPct = 0.40;
      driftPct = 0.20;
    } else {
      // ⚖️ Neutral: Multi-Strategy Balanced Yield (Drift 40%, Kamino 40%, JitoSOL 20%)
      jitoPct = 0.20;
      kaminoPct = 0.40;
      driftPct = 0.40;
    }

    state.jitoSolBalance = totalBalance * jitoPct;
    state.kaminoBalance = totalBalance * kaminoPct;
    state.driftBalance = totalBalance * driftPct;
    state.allocation = {
      jitoSol: jitoPct,
      kamino: kaminoPct,
      drift: driftPct,
      fng: fngValue
    };
  }

  /**
   * Accrue simulated interest based on time elapsed across all strategy pools
   */
  accrueSimulatedInterest(state) {
    const now = Date.now();
    const elapsedMs = now - state.lastAccruedTime;
    
    // Initialize strategy balances if missing
    if (state.jitoSolBalance === undefined) state.jitoSolBalance = 0;
    if (state.kaminoBalance === undefined) state.kaminoBalance = 0;
    if (state.driftBalance === undefined) state.driftBalance = 0;

    if (elapsedMs <= 0) {
      state.lastAccruedTime = now;
      return 0;
    }

    const totalBalance = state.jitoSolBalance + state.kaminoBalance + state.driftBalance;
    if (totalBalance <= 0) {
      state.lastAccruedTime = now;
      return 0;
    }

    const msInYear = 365 * 24 * 60 * 60 * 1000;
    const years = elapsedMs / msInYear;

    // Fetch Fear & Greed index
    let fngVal = 50;
    try {
      const trends = this.agent.brain?.memory?.analytics_feedback?.market_trends;
      if (trends && trends.fng && trends.fng.value !== undefined) {
        fngVal = trends.fng.value;
      }
    } catch (e) {}

    // Accrue interest for each specific pool based on their APYs
    const jitoInterest = state.jitoSolBalance * (Math.pow(1 + this.jitoSolApy, years) - 1);
    const kaminoInterest = state.kaminoBalance * (Math.pow(1 + this.kaminoApy, years) - 1);
    const driftInterest = state.driftBalance * (Math.pow(1 + this.driftApy, years) - 1);

    const totalInterest = jitoInterest + kaminoInterest + driftInterest;

    if (totalInterest > 0) {
      state.jitoSolBalance += jitoInterest;
      state.kaminoBalance += kaminoInterest;
      state.driftBalance += driftInterest;
      state.totalAccruedYieldSol = (state.totalAccruedYieldSol || 0) + totalInterest;
      
      console.log(`[YieldManager] Accrued dynamic interest: +${totalInterest.toFixed(8)} SOL (JitoSOL: +${jitoInterest.toFixed(8)}, Kamino: +${kaminoInterest.toFixed(8)}, Drift: +${driftInterest.toFixed(8)})`);
    }

    // Adaptively reallocate based on current FNG weights
    this.reallocateYieldCapital(state, fngVal);

    state.lastAccruedTime = now;
    return totalInterest;
  }

  /**
   * Sweep idle SOL to JitoSOL staking
   */
  async sweepIdleSolToYield(minSolToKeep = 0.03) {
    console.log(`\n--- 🌾 [YieldManager - ${this.agent.mode.toUpperCase()}] 啟動閒置資金理財劃轉 (Yield Backing Sweep) ---`);
    this.agent.logToWeb('Yield', 'INFO', 'Scanning for idle SOL balance to deploy to dynamic yield pools...');
    
    const state = this.loadYieldState();
    this.accrueSimulatedInterest(state);

    // Get current real SOL balance
    let realSolBalance = 0;
    try {
      const pubKey = this.wallet.getSigner().publicKey;
      const lamports = await this.connection.getBalance(pubKey);
      realSolBalance = lamports / 1e9;
      console.log(`[YieldManager] Live wallet balance: ${realSolBalance.toFixed(4)} SOL`);
    } catch (err) {
      console.warn(`[YieldManager] Failed to fetch live balance: ${err.message}. Assuming Paper mode.`);
    }

    // Check if we are in Live or Paper trading mode
    const isLive = !this.trader.isPaperTrading;

    let fngVal = 50;
    try {
      const trends = this.agent.brain?.memory?.analytics_feedback?.market_trends;
      if (trends && trends.fng && trends.fng.value !== undefined) {
        fngVal = trends.fng.value;
      }
    } catch (e) {}

    if (isLive) {
      // LIVE SWEEP
      const sweepableSol = realSolBalance - minSolToKeep;
      if (sweepableSol > 0.01) {
        console.log(`🚀 [YieldManager] 實戰模式：準備劃轉 ${sweepableSol.toFixed(4)} SOL 至 JitoSOL 質押理財...`);
        this.agent.logToWeb('Yield', 'INFO', `Live sweep: Swapping ${sweepableSol.toFixed(4)} SOL to yield-bearing JitoSOL...`);
        
        try {
          const swapResult = await this.trader.executeSwap(this.jitoSolMint, sweepableSol, true, null, 50); // 0.5% slippage
          if (swapResult && swapResult.success) {
            const outJitoSol = swapResult.amountOut;
            state.jitoSolBalance += outJitoSol;
            
            this.reallocateYieldCapital(state, fngVal);
            this.saveYieldState(state);
            
            console.log(`✅ [YieldManager] 實戰理財劃轉成功！獲取 JitoSOL: ${outJitoSol.toFixed(6)}`);
            this.agent.logToWeb('Yield', 'SUCCESS', `Successfully staked ${sweepableSol.toFixed(4)} SOL -> ${outJitoSol.toFixed(6)} JitoSOL (APY: ~7.5%)`);
          }
        } catch (swapErr) {
          console.error(`❌ [YieldManager] 實戰理財劃轉失敗:`, swapErr.message);
          this.agent.logToWeb('Yield', 'ERROR', `Live sweep swap failed: ${swapErr.message}`);
        }
      } else {
        console.log(`[YieldManager] 實戰模式：餘額 ${realSolBalance.toFixed(4)} SOL 未達理財起點 (保留線: ${minSolToKeep} SOL)。`);
        this.agent.logToWeb('Yield', 'INFO', `Live SOL balance (${realSolBalance.toFixed(4)}) below sweep threshold.`);
      }
    } else {
      // PAPER (SIMULATED) SWEEP
      // Calculate idle virtual balance
      const positions = this.agent.loadPositions();
      const totalVirtualBalanceUSD = this.agent.virtualPortfolio.balanceUSD;
      
      // If we have substantial virtual cash
      if (totalVirtualBalanceUSD > 5000.00) {
        const approxSolPrice = await config.getSolPrice();
        const sweepableUSD = totalVirtualBalanceUSD * 0.8; // Sweep 80% of idle virtual cash to yield pool
        const virtualSolAmount = sweepableUSD / approxSolPrice;
        
        console.log(`[YieldManager] 模擬模式：自動劃轉 $${sweepableUSD.toFixed(2)} USD (${virtualSolAmount.toFixed(4)} SOL) 閒置資金至虛擬 JitoSOL 理財池...`);
        this.agent.logToWeb('Yield', 'SUCCESS', `Simulated sweep: Staked $${sweepableUSD.toFixed(2)} USD (${virtualSolAmount.toFixed(4)} SOL equivalent) to institutional yield pools.`);
        
        state.jitoSolBalance += virtualSolAmount;
        this.agent.virtualPortfolio.balanceUSD -= sweepableUSD;
        this.agent.saveVirtualPortfolio();
        
        this.reallocateYieldCapital(state, fngVal);
        this.saveYieldState(state);
      } else {
        console.log(`[YieldManager] 模擬模式：虛擬可用餘額較低 ($${totalVirtualBalanceUSD.toFixed(2)})，跳過理財劃轉。`);
      }
    }

    this.saveYieldState(state);
    this.updateAgentDashboardYield(state);
    console.log(`--- 🌾 [YieldManager] 理財劃轉掃描完成 ---\n`);
  }

  /**
   * Recall proportional capital back to SOL to cover standard buy trades
   */
  async recallYieldToSol(solAmountNeeded) {
    console.log(`\n--- 🌾 [YieldManager - ${this.agent.mode.toUpperCase()}] 啟動資金贖回 (Recall Yield) ---`);
    this.agent.logToWeb('Yield', 'INFO', `Recalling ${solAmountNeeded.toFixed(4)} SOL from institutional dynamic yield pools...`);
    
    const state = this.loadYieldState();
    this.accrueSimulatedInterest(state);

    const isLive = !this.trader.isPaperTrading;

    if (isLive) {
      // LIVE RECALL
      if (state.jitoSolBalance <= 0) {
        console.warn(`⚠️ [YieldManager] 實戰模式：理財池中無可用 JitoSOL 餘額。`);
        return false;
      }
      
      console.log(`🚀 [YieldManager] 實戰模式：正在將 JitoSOL 贖回至 SOL... (需要 SOL: ${solAmountNeeded.toFixed(4)})`);
      try {
        const jitoSolToSwap = solAmountNeeded * 1.01;
        const swapResult = await this.trader.executeSwap(this.jitoSolMint, jitoSolToSwap, false, null, 50); // Swap out
        if (swapResult && swapResult.success) {
          const outSol = swapResult.amountOut;
          state.jitoSolBalance = Math.max(0, state.jitoSolBalance - jitoSolToSwap);
          this.saveYieldState(state);
          
          console.log(`✅ [YieldManager] 實戰資金贖回成功！獲得 SOL: ${outSol.toFixed(6)}`);
          this.agent.logToWeb('Yield', 'SUCCESS', `Successfully unstaked ${jitoSolToSwap.toFixed(6)} JitoSOL -> ${outSol.toFixed(6)} SOL`);
          return true;
        }
      } catch (swapErr) {
        console.error(`❌ [YieldManager] 實戰資金贖回失敗:`, swapErr.message);
        this.agent.logToWeb('Yield', 'ERROR', `Recall yield swap failed: ${swapErr.message}`);
      }
    } else {
      // PAPER RECALL
      const approxSolPrice = await config.getSolPrice();
      const usdNeeded = solAmountNeeded * approxSolPrice;
      const jitoSolNeeded = solAmountNeeded;
      
      const totalBalance = (state.jitoSolBalance || 0) + (state.kaminoBalance || 0) + (state.driftBalance || 0);

      if (totalBalance >= jitoSolNeeded) {
        // Proportionally unstake from each strategy
        state.jitoSolBalance -= jitoSolNeeded * (state.jitoSolBalance / totalBalance);
        state.kaminoBalance -= jitoSolNeeded * (state.kaminoBalance / totalBalance);
        state.driftBalance -= jitoSolNeeded * (state.driftBalance / totalBalance);

        this.agent.virtualPortfolio.balanceUSD += usdNeeded;
        this.agent.saveVirtualPortfolio();
        this.saveYieldState(state);
        
        console.log(`✅ [YieldManager] 模擬模式：成功贖回 $${usdNeeded.toFixed(2)} USD (${jitoSolNeeded.toFixed(4)} SOL equivalent)。`);
        this.agent.logToWeb('Yield', 'SUCCESS', `Simulated recall: Redeemed ${jitoSolNeeded.toFixed(4)} SOL equivalent -> $${usdNeeded.toFixed(2)} USD from institutional yield pools.`);
        return true;
      } else {
        console.warn(`[YieldManager] 模擬模式：理財池中總理財餘額不足 (${totalBalance.toFixed(4)} < ${jitoSolNeeded.toFixed(4)})`);
      }
    }

    this.saveYieldState(state);
    this.updateAgentDashboardYield(state);
    return false;
  }

  /**
   * Inject Yield Stats into Web Dashboard JSON
   */
  async updateAgentDashboardYield(state) {
    const dataPath = path.join(__dirname, '../../public/data.json');
    if (!fs.existsSync(dataPath)) return;
    
    try {
      const raw = fs.readFileSync(dataPath, 'utf8');
      const payload = JSON.parse(raw);
      
      if (payload[this.agent.mode]) {
        const approxSolPrice = await config.getSolPrice();
        const totalBalance = (state.jitoSolBalance || 0) + (state.kaminoBalance || 0) + (state.driftBalance || 0);
        const yieldUSD = totalBalance * approxSolPrice;
        const totalYieldEarnedUSD = (state.totalAccruedYieldSol || 0) * approxSolPrice;
        
        // Calculate dynamic weighted APY
        let weightedApy = this.jitoSolApy;
        if (state.allocation) {
          weightedApy = (state.allocation.jitoSol * this.jitoSolApy) +
                        (state.allocation.kamino * this.kaminoApy) +
                        (state.allocation.drift * this.driftApy);
        }

        payload[this.agent.mode].yieldFarming = {
          jitoSolBalance: totalBalance,
          yieldUSD: yieldUSD,
          totalAccruedYieldSol: state.totalAccruedYieldSol || 0,
          totalYieldEarnedUSD: totalYieldEarnedUSD,
          apy: weightedApy,
          lastAccruedTime: new Date(state.lastAccruedTime).toLocaleString(),
          
          // Institutional Matrix Details
          institutional: {
            jitoSolBalance: state.jitoSolBalance || 0,
            kaminoBalance: state.kaminoBalance || 0,
            driftBalance: state.driftBalance || 0,
            allocation: state.allocation || { jitoSol: 0.2, kamino: 0.4, drift: 0.4 }
          }
        };
        
        fs.writeFileSync(dataPath, JSON.stringify(payload, null, 2), 'utf8');
      }
    } catch (e) {
      console.warn('[YieldManager Dashboard Sync Error]:', e.message);
    }
  }
}

module.exports = YieldManager;
