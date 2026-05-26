const fs = require('fs');
const path = require('path');
const config = require('../../config');
const binanceTrader = require('../../binance_trader');
const smartMoneyStrategy = require('../../smart_money_strategy');
const brain = require('../../brain');
const {
  loadBinanceTradeState,
  saveBinanceTradeState,
  resetDailyCountIfNeeded,
  selectWeightedSymbol
} = require('./state-manager');

const axios = require('axios');

/**
 * Public function to calculate 7-day Pearson correlation coefficient between two symbols
 */
async function calculateCorrelationWithBinance(symbolA, symbolB) {
  try {
    const sA = `${symbolA.toUpperCase()}USDT`;
    const sB = `${symbolB.toUpperCase()}USDT`;
    
    // Fetch 7 daily K-lines for both symbols
    const urlA = `https://fapi.binance.com/fapi/v1/klines?symbol=${sA}&interval=1d&limit=7`;
    const urlB = `https://fapi.binance.com/fapi/v1/klines?symbol=${sB}&interval=1d&limit=7`;
    
    const [resA, resB] = await Promise.all([
      axios.get(urlA, { timeout: 5000 }),
      axios.get(urlB, { timeout: 5000 })
    ]);
    
    const closesA = resA.data.map(k => parseFloat(k[4])); // index 4 is Close price
    const closesB = resB.data.map(k => parseFloat(k[4]));
    
    if (closesA.length < 5 || closesB.length < 5) return 1.0; 

    // Pearson Correlation calculation
    const n = closesA.length;
    let sumA = 0, sumB = 0, sumAB = 0, sumA2 = 0, sumB2 = 0;
    
    for (let i = 0; i < n; i++) {
      const a = closesA[i];
      const b = closesB[i];
      sumA += a;
      sumB += b;
      sumAB += a * b;
      sumA2 += a * a;
      sumB2 += b * b;
    }
    
    const num = (n * sumAB) - (sumA * sumB);
    const den = Math.sqrt(((n * sumA2) - (sumA * sumA)) * ((n * sumB2) - (sumB * sumB)));
    
    if (den === 0) return 0.0;
    return num / den;
  } catch (err) {
    console.warn(`[Correlation Check] Correlation query failed: ${err.message}. Standardizing on cautious safety fallback (0.8).`);
    return 0.8;
  }
}

/**
 * Helper to hot-reload trading params from config/trading-params.json
 */
function loadAllTradingParams() {
  const paramsPath = path.join(__dirname, '../../../config/trading-params.json');
  try {
    if (fs.existsSync(paramsPath)) {
      const content = fs.readFileSync(paramsPath, 'utf8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.warn(`[PositionChecker] Failed to load trading params JSON: ${err.message}`);
  }
  return null;
}

/**
 * Check all open Binance positions and close if:
 * - Mark price hit TAKE_PROFIT_PCT → win
 * - Mark price hit STOP_LOSS_PCT → loss
 * - Trailing Stop triggered → win/loss
 * - Max hold time exceeded → force close
 */
async function checkAndCloseBinancePositions(agent) {
  const agentMode = agent.mode || 'conservative';
  const state = loadBinanceTradeState(agentMode);
  if (!state.openPositions || state.openPositions.length === 0) return;

  const modeParams = config[agentMode] || config.conservative;
  const brainAdjustments = typeof brain.getStrategyAdjustments === 'function' ? brain.getStrategyAdjustments(agentMode) : {};
  
  // Use brain/FNG adjustments if available, otherwise fall back to agent config
  const tpPct = brainAdjustments.TAKE_PROFIT_PCT !== undefined ? brainAdjustments.TAKE_PROFIT_PCT : (modeParams.TAKE_PROFIT_PCT || 0.10);
  const slPct = brainAdjustments.STOP_LOSS_PCT !== undefined ? Math.abs(brainAdjustments.STOP_LOSS_PCT) : Math.abs(modeParams.STOP_LOSS_PCT || 0.05);
  
  const maxHoldMinutes = modeParams.TIMEOUT_MINUTES || 45;
  const maxHoldMs = maxHoldMinutes * 60000;
  
  // Load hot-reloadable trading parameters!
  const allParams = loadAllTradingParams();
  const trailingParams = allParams && allParams.trailing ? allParams.trailing : {};
  const agentTrailing = trailingParams[agentMode === 'conservative' ? 'conservative' : 'aggressive'] || {};
  
  let triggerPct = (agentTrailing.activate !== undefined ? agentTrailing.activate : (agentMode === 'aggressive' ? 0.035 : 0.12)) * 100;
  let retractPct = (agentTrailing.maxRetrace !== undefined ? agentTrailing.maxRetrace : (agentMode === 'aggressive' ? 0.012 : 0.035)) * 100;

  const fngValue = brain.memory?.analytics_feedback?.market_trends?.fng?.value || 50;

  // Granular FNG Greed Modulation for ZMAC Trailing Stop retraction
  if (agentMode === 'aggressive') {
    const fngConfig = allParams && allParams.fng ? allParams.fng : {};
    const extremeGreedLimit = fngConfig.extremeGreed || 80;
    const highGreedLimit = fngConfig.highGreed || 70;
    const zmacFng = fngConfig.zmac || {};
    
    const extremeRetrace = zmacFng.extremeTrailingRetrace !== undefined ? zmacFng.extremeTrailingRetrace * 100 : 0.8;
    const highRetrace = zmacFng.highTrailingRetrace !== undefined ? zmacFng.highTrailingRetrace * 100 : 0.9;

    if (fngValue > extremeGreedLimit) {
      retractPct = extremeRetrace;
      console.log(`🔥 [FNG Modulation] Extreme Greed (${fngValue}) ZMAC Trailing Stop retract tightened to ${retractPct}%`);
    } else if (fngValue >= highGreedLimit && fngValue <= extremeGreedLimit) {
      retractPct = highRetrace;
      console.log(`🔥 [FNG Modulation] High Greed (${fngValue}) ZMAC Trailing Stop retract tightened to ${retractPct}%`);
    }
  }

  const now = Date.now();
  let changed = false;

  for (let i = state.openPositions.length - 1; i >= 0; i--) {
    const pos = state.openPositions[i];
    if (pos.status !== 'open') continue;

    const entryMs = new Date(pos.time).getTime();
    const ageMs = now - entryMs;
    
    let markPrice;
    try {
      markPrice = await binanceTrader.getMarkPrice(`${pos.symbol}USDT`);
    } catch (e) {
      console.warn(`[BinanceClose - ${agentMode}] Failed to fetch mark price for ${pos.symbol}:`, e.message);
      continue;
    }

    const entryPrice = pos.entryPrice || markPrice;
    
    // Signed profit percentage based on direction
    let pnlPct = 0;
    if (entryPrice > 0) {
      if (pos.signal === 'SHORT') {
        pnlPct = (entryPrice - markPrice) / entryPrice; // SHORT gains when price falls
      } else {
        pnlPct = (markPrice - entryPrice) / entryPrice; // LONG gains when price rises
      }
    }

    // Calculate true weighted ROI% of combined spot and futures positions
    const spotPnL = pos.spotUsdt ? pos.spotUsdt * pnlPct : 0;
    const futPnL = pos.futuresUsdt ? pos.futuresUsdt * pnlPct * (pos.leverage || 1) : 0;
    const totalCost = (pos.spotUsdt || 0) + (pos.futuresUsdt || 0);
    const totalPnL = spotPnL + futPnL;
    const currentPnlVal = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

    // Trailing stop updates
    pos.maxPnlPercent = Math.max(parseFloat(pos.maxPnlPercent || 0), currentPnlVal);

    let reason = null;
    let result = null;

    // Check trailing stop trigger
    let isTrailingTriggered = false;
    if (pos.maxPnlPercent >= triggerPct) {
      const drawdown = pos.maxPnlPercent - currentPnlVal;
      console.log(`🔄 [Binance Trailing Stop - ${agentMode}] ${pos.symbol} (${pos.signal}) Max Profit: ${pos.maxPnlPercent.toFixed(2)}% | Current: ${currentPnlVal.toFixed(2)}% | Drawdown: ${drawdown.toFixed(2)}% (Limit: ${retractPct.toFixed(2)}%)`);
      if (drawdown >= retractPct) {
        isTrailingTriggered = true;
      }
    }

    if (isTrailingTriggered) {
      reason = `Trailing Stop hit (Peak ${pos.maxPnlPercent.toFixed(1)}% / Current ${currentPnlVal.toFixed(1)}%)`;
      result = currentPnlVal >= 0 ? 'win' : 'loss';
    }
    // Check take profit
    else if (pnlPct >= tpPct) {
      reason = `TP ${(tpPct * 100).toFixed(0)}% hit (${(pnlPct * 100).toFixed(2)}%)`;
      result = 'win';
    }
    // Check stop loss
    else if (pnlPct <= -slPct) {
      reason = `SL ${(slPct * 100).toFixed(0)}% hit (${(pnlPct * 100).toFixed(2)}%)`;
      result = 'loss';
    }
    // Check max hold time
    else if (ageMs >= maxHoldMs) {
      reason = `Max hold ${maxHoldMinutes}m exceeded (${Math.floor(ageMs / 60000)}m)`;
      result = currentPnlVal >= 0 ? 'win' : 'loss';
    }

    if (reason) {
      // Execute flatting on Binance Testnet Exchange if LIVE
      let closeSpotSuccess = true;
      let closeFuturesSuccess = true;

      if (pos.type === 'LIVE') {
        // Flat spot position (Spot only exists for LONG positions!)
        if (pos.spotUsdt && pos.signal !== 'SHORT') {
          try {
            console.log(`🔒 [BinanceClose - ${agentMode}] Liquidating spot for ${pos.symbol}...`);
            const qtyToSell = pos.executedQtySpot || (pos.spotUsdt / entryPrice);
            const closeSpotResult = await binanceTrader.executeSpotOrder(`${pos.symbol}USDT`, 'SELL', pos.spotUsdt, qtyToSell);
            closeSpotSuccess = closeSpotResult.success;
          } catch (spotErr) {
            console.error(`❌ [BinanceClose - ${agentMode}] Spot liquidation failed:`, spotErr.message);
            closeSpotSuccess = false;
          }
        }

        // Flat futures position (Both LONG and SHORT)
        if (pos.futuresUsdt) {
          try {
            console.log(`🔒 [BinanceClose - ${agentMode}] Liquidating futures for ${pos.symbol} (${pos.signal})...`);
            let qtyToClose = pos.executedQtyFutures || 0;
            if (qtyToClose === 0) {
              const accInfo = await binanceTrader.getFuturesAccountInfo();
              const matchingPos = accInfo.positions.find(p => p.symbol === `${pos.symbol}USDT`);
              qtyToClose = matchingPos ? Math.abs(matchingPos.positionAmt) : 0;
            }
            if (qtyToClose > 0) {
              const originalSide = pos.signal === 'SHORT' ? 'SELL' : 'BUY';
              const closeFuturesResult = await binanceTrader.closeFuturesPosition(`${pos.symbol}USDT`, originalSide, qtyToClose);
              closeFuturesSuccess = closeFuturesResult.success;
              if (pos.stopOrderId) {
                console.log(`🔒 [BinanceClose - ${agentMode}] Canceling SL order #${pos.stopOrderId}`);
                await binanceTrader.cancelFuturesOrder(`${pos.symbol}USDT`, pos.stopOrderId);
              }
            } else {
              console.warn(`[BinanceClose - ${agentMode}] No contracts to close on exchange for ${pos.symbol}`);
            }
          } catch (futuresErr) {
            console.error(`❌ [BinanceClose - ${agentMode}] Futures liquidation failed:`, futuresErr.message);
            closeFuturesSuccess = false;
          }
        }
      }

      // Record closing in local state
      const closed = {
        symbol: pos.symbol,
        openedAt: pos.time,
        closedAt: new Date().toISOString(),
        entryPrice: entryPrice,
        exitPrice: markPrice,
        pnlPct: parseFloat(currentPnlVal.toFixed(2)),
        spotPnL: parseFloat(spotPnL.toFixed(2)),
        futuresPnL: parseFloat(futPnL.toFixed(2)),
        totalPnL: parseFloat((spotPnL + futPnL).toFixed(2)),
        reason: reason,
        result: result,
        leverage: pos.leverage || 1,
        spotUsdt: pos.spotUsdt || 0,
        futuresUsdt: pos.futuresUsdt || 0,
        pillarsPassed: pos.pillarsPassed,
        pillarScores: pos.pillarScores || {},
        signal: pos.signal || 'LONG',
        type: pos.type || 'LIVE',
        fngValue: pos.fngValue || fngValue,
        matchedKeywords: pos.matchedKeywords || [],
        finalSignalStrength: pos.finalSignalStrength || 0
      };
      state.closedTrades.push(closed);

      // Update stats
      if (result === 'win') state.stats.winningTrades++;
      else state.stats.losingTrades++;
      state.stats.totalSpotPnL = parseFloat((state.stats.totalSpotPnL + spotPnL).toFixed(2));
      state.stats.totalFuturesPnL = parseFloat((state.stats.totalFuturesPnL + futPnL).toFixed(2));

      // Blacklist on loss
      if (result === 'loss' && state.blacklist[pos.symbol]) {
        state.blacklist[pos.symbol].consecutiveLosses = (state.blacklist[pos.symbol].consecutiveLosses || 0) + 1;
        const maxLosses = config.BINANCE_TRADE_BLACKLIST_MAX_LOSSES || 3;
        if (state.blacklist[pos.symbol].consecutiveLosses >= maxLosses) {
          const cooldownMs = (config.BINANCE_TRADE_BLACKLIST_COOLDOWN_HOURS || 24) * 3600000;
          state.blacklist[pos.symbol].cooldownUntil = now + cooldownMs;
          console.log(`⛔ [BinanceClose - ${agentMode}] ${pos.symbol} blacklisted for ${config.BINANCE_TRADE_BLACKLIST_COOLDOWN_HOURS || 24}h`);
        }
      }
      // Reset blacklist on win
      if (result === 'win' && state.blacklist[pos.symbol]) {
        state.blacklist[pos.symbol].consecutiveLosses = 0;
        state.blacklist[pos.symbol].cooldownUntil = null;
      }

      pos.status = 'closed';
      pos.closeTime = closed.closedAt;
      pos.closeReason = reason;
      pos.closePnl = closed.totalPnL;
      changed = true;
      console.log(`🔒 [BinanceClose - ${agentMode}] ${pos.symbol} ${result.toUpperCase()} — ${reason} (PnL: ${closed.totalPnL >= 0 ? '+' : ''}$${closed.totalPnL})`);
      agent.logToWeb('BinanceTrade', result === 'win' ? 'SUCCESS' : 'WARNING', `Close ${pos.symbol} ${result.toUpperCase()} $${closed.totalPnL} — ${reason}`);
    }
  }

  if (changed) {
    saveBinanceTradeState(state, agentMode);
    try {
      await agent.updateWebDashboard(agent.loadPositions());
    } catch (_) {}
  }
}

/**
 * Binance Mock Trading Loop — full flow:
 * 1. Check enabled, limits, blacklist
 * 2. Weighted symbol selection
 * 3. 5-pillar evaluation
 * 4. If passed: check exposure, place spot + futures with stop loss
 * 5. Record trade, update stats, refresh dashboard
 */
async function binanceMockTradeLoop(agent) {
  if (!binanceTrader.isConfigured()) {
    console.log('ℹ️ [BinanceMockTrade] Binance Testnet API Key not configured. Skipping.');
    return;
  }

  const agentMode = agent.mode || 'conservative';
  const modeParams = config[agentMode] || config.conservative;

  const isDryRun = config.BINANCE_TRADE_DRY_RUN === true;
  const state = loadBinanceTradeState(agentMode);
  resetDailyCountIfNeeded(state);

  // --- Check daily/weekly limits ---
  if (state.stats.dailyTradeCount >= (config.BINANCE_TRADE_MAX_DAILY_TRADES || 3)) {
    console.log(`⏸️ [BinanceMockTrade - ${agentMode}] Daily trade limit reached (${state.stats.dailyTradeCount}/${config.BINANCE_TRADE_MAX_DAILY_TRADES}). Skipping.`);
    return;
  }
  if (state.stats.weeklyTradeCount >= (config.BINANCE_TRADE_MAX_WEEKLY_TRADES || 10)) {
    console.log(`⏸️ [BinanceMockTrade - ${agentMode}] Weekly trade limit reached (${state.stats.weeklyTradeCount}/${config.BINANCE_TRADE_MAX_WEEKLY_TRADES}). Skipping.`);
    return;
  }

  // Check current open positions count vs max positions
  const openPosList = state.openPositions.filter(p => p.status === 'open');
  const maxAllowedPositions = modeParams.MAX_POSITIONS || 2;
  if (openPosList.length >= maxAllowedPositions) {
    console.log(`⏸️ [BinanceMockTrade - ${agentMode}] Open positions count (${openPosList.length}) reached max limit (${maxAllowedPositions}). Skipping.`);
    return;
  }

  // --- Weighted symbol selection ---
  const targetSymbol = selectWeightedSymbol(state);
  if (!targetSymbol) {
    console.log(`⏸️ [BinanceMockTrade - ${agentMode}] All symbols blacklisted. Skipping.`);
    return;
  }

  // Prevent buying duplicate token
  const hasDuplicate = openPosList.some(p => p.symbol === targetSymbol);
  if (hasDuplicate) {
    console.log(`⏸️ [BinanceMockTrade - ${agentMode}] Already holding open position in ${targetSymbol}. Skipping to prevent duplication.`);
    return;
  }

  const now = new Date();
  const fngValue = brain.memory?.analytics_feedback?.market_trends?.fng?.value || 50;
  console.log(`\n💰 [${now.toLocaleTimeString()}] 啟動幣安 Testnet 模擬交易評估 (${agentMode.toUpperCase()}): ${targetSymbol}${isDryRun ? ' [DRY RUN]' : ''}`);

  try {
    // --- Execute 5-pillar smart money strategy & record individual scores ---
    const auditResult = await smartMoneyStrategy.evaluateToken(targetSymbol, fngValue);
    const details = auditResult.details || {};
    const pillarScores = {};
    const pillarNames = [];
    Object.keys(details).forEach(key => {
      const d = details[key];
      pillarScores[key] = d.score;
      pillarNames.push(`${d.name}: Bullish ${d.score > 0 ? '✅' : '❌'} / Bearish ${d.bearishScore > 0 ? '✅' : '❌'}`);
    });
    const pillarsPassed = Object.values(details).filter(d => d.score > 0 || d.bearishScore > 0).map(d => d.name).join('; ');

    console.log(`📊 [BinanceMockTrade - ${agentMode}] ${targetSymbol}: Bullish ${auditResult.bullishScore}/5 | Bearish ${auditResult.bearishScore}/5`);
    pillarNames.forEach(n => console.log(`   ${n}`));
    agent.logToWeb('BinanceTrade', 'INFO', `${targetSymbol} Bullish ${auditResult.bullishScore}/5, Bearish ${auditResult.bearishScore}/5`);

    if (auditResult.signal === 'HOLD') {
      console.log(`⏸️ [BinanceMockTrade - ${agentMode}] ${targetSymbol} no resonance signal (Bullish ${auditResult.bullishScore}/5, Bearish ${auditResult.bearishScore}/5). Skipping.`);
      saveBinanceTradeState(state, agentMode);
      return;
    }

    const signal = auditResult.signal; // 'LONG' or 'SHORT'

    // --- Personality Rules for Green vs ZMAC ---

    if (agentMode === 'conservative' && signal === 'SHORT') {
      // Green only shorts during bear/extreme bear FNG <= 30 + 5-Pillar Score 5
      const isBearHedge = fngValue <= 30 && auditResult.bearishScore === 5;
      if (!isBearHedge) {
        console.log(`⏸️ [BinanceMockTrade - conservative] Green sniper only shorts in bear/extreme bear markets (FNG <= 30 and 5-Pillar Bearish=5). Currently FNG: ${fngValue}, Bearish: ${auditResult.bearishScore}. Skipping SHORT.`);
        saveBinanceTradeState(state, agentMode);
        return;
      }
      console.log(`🛡️ [BinanceMockTrade - conservative] Green sniper ACTIVATED SHORT hedging in bear market (FNG: ${fngValue})!`);
    }

    // --- Query Fear & Greed freeze logic (after evaluating signal for protective hedging exceptions!) ---
    const brainAdjustments = typeof brain.getStrategyAdjustments === 'function' ? brain.getStrategyAdjustments(agentMode) : {};
    if (brainAdjustments.MAX_POSITIONS === 0) {
      // Bypassed ONLY if it is conservative Green executing a protective SHORT hedging order in bear markets (FNG <= 30)
      const isProtectiveShortHedge = agentMode === 'conservative' && signal === 'SHORT' && fngValue <= 30 && auditResult.bearishScore === 5;
      if (!isProtectiveShortHedge) {
        console.log(`⏸️ [BinanceMockTrade - ${agentMode.toUpperCase()}] FNG Extreme Fear triggered! All trading frozen.`);
        saveBinanceTradeState(state, agentMode);
        return;
      }
      console.log(`🛡️ [BinanceMockTrade - conservative] Bypassing FNG Extreme Fear freeze for protective SHORT hedging trade!`);
    }

    // --- Correlation Check across agents (Pearson Correlation Coefficients) ---
    const otherMode = agentMode === 'conservative' ? 'aggressive' : 'conservative';
    const otherState = loadBinanceTradeState(otherMode);
    const otherOpenPositions = otherState.openPositions.filter(p => p.status === 'open');

    for (const pos of otherOpenPositions) {
      if (pos.signal === signal) {
        // If symbol matches exactly, correlation is 1.0
        if (pos.symbol === targetSymbol) {
          console.log(`⏸️ [BinanceMockTrade - ${agentMode}] Skipping ${targetSymbol} ${signal} because ${otherMode} is already holding it in the same direction.`);
          saveBinanceTradeState(state, agentMode);
          return;
        }
        // Calculate correlation between targetSymbol and pos.symbol
        const correlation = await calculateCorrelationWithBinance(targetSymbol, pos.symbol);
        console.log(`🔄 [Correlation Check] Correlation between $${targetSymbol} and $${pos.symbol}: ${correlation.toFixed(3)}`);
        if (correlation > 0.75) {
          console.log(`⏸️ [BinanceMockTrade - ${agentMode}] Skipping $${targetSymbol} ${signal} because it has high correlation (${correlation.toFixed(2)} > 0.75) with $${pos.symbol} ${signal} held by ${otherMode}.`);
          saveBinanceTradeState(state, agentMode);
          return;
        }
      }
    }

    // --- Portfolio Size Calculations (Strict Risk Limits) ---
    let virtualBalance = 100000.00;
    if (agent.portfolioManager.virtualPortfolio && agent.portfolioManager.virtualPortfolio.balanceUSD) {
      virtualBalance = agent.portfolioManager.virtualPortfolio.balanceUSD;
    } else {
      agent.portfolioManager.loadVirtualPortfolio();
      if (agent.portfolioManager.virtualPortfolio) {
        virtualBalance = agent.portfolioManager.virtualPortfolio.balanceUSD;
      }
    }

    // Load hot-reloadable trading parameters!
    const allParams = loadAllTradingParams();
    
    // Sizing
    let riskPct = agentMode === 'aggressive' ? 0.035 : 0.015;
    let futLeverage = agentMode === 'aggressive' ? 10 : 5;

    // Granular FNG Fear Modulation: conservative Green risk size & leverage capped dynamically
    if (agentMode === 'conservative') {
      const fngConfig = allParams && allParams.fng ? allParams.fng : {};
      const extremeFearLimit = fngConfig.extremeFear || 20;
      const highFearLimit = fngConfig.highFear || 30;
      const greenFng = fngConfig.green || {};
      
      const extremeLevCap = greenFng.extremeShortLeverageCap !== undefined ? greenFng.extremeShortLeverageCap : 3;
      const extremeMultiplier = greenFng.extremeAllocationMultiplier !== undefined ? greenFng.extremeAllocationMultiplier : 0.5;
      const highLevCap = greenFng.highShortLeverageCap !== undefined ? greenFng.highShortLeverageCap : 4;
      const highMultiplier = greenFng.highAllocationMultiplier !== undefined ? greenFng.highAllocationMultiplier : 0.6;

      if (fngValue < extremeFearLimit) {
        riskPct = riskPct * extremeMultiplier; 
        futLeverage = extremeLevCap;  
        console.log(`❄️ [FNG Modulation] Extreme Fear (${fngValue}) conservative Green risk size set to ${riskPct * 100}%, leverage capped at ${futLeverage}x`);
      } else if (fngValue >= extremeFearLimit && fngValue <= highFearLimit) {
        riskPct = riskPct * highMultiplier;  
        futLeverage = highLevCap;  
        console.log(`❄️ [FNG Modulation] High Fear (${fngValue}) conservative Green risk size set to ${riskPct * 100}%, leverage capped at ${futLeverage}x`);
      }
    } else if (agentMode === 'aggressive') {
      // Dynamic leverage between 8x to 15x depending on market sentiment
      if (fngValue > 65) futLeverage = 15;
      else if (fngValue < 35) futLeverage = 8;
      else futLeverage = 10;
    }

    const baseAllocation = Math.min(3000, virtualBalance * riskPct);

    // Total exposure constraint
    const currentExposure = openPosList.reduce((sum, p) => sum + (p.spotUsdt || 0) + (p.futuresUsdt || 0), 0);
    const maxExposureRatio = agentMode === 'aggressive' ? 0.30 : 0.20; // 30% aggregate for ZMAC, 20% Green
    const maxExposure = virtualBalance * maxExposureRatio;

    // Spot and futures sizes based on signal
    let spotUsdt = 0;
    let futUsdt = 0;

    if (signal === 'LONG') {
      spotUsdt = Math.round(baseAllocation / 2);
      futUsdt = Math.round(baseAllocation / 2);
    } else {
      // Spot cannot be shorted, so for SHORT trades we do not open spot positions
      spotUsdt = 0;
      futUsdt = Math.round(baseAllocation);
    }

    const totalNew = spotUsdt + futUsdt;

    if (currentExposure + totalNew > maxExposure) {
      console.log(`⏸️ [BinanceMockTrade - ${agentMode}] Total exposure limit hit (current $${currentExposure.toFixed(0)} + new $${totalNew.toFixed(0)} > max allowed $${maxExposure.toFixed(0)}). Skipping.`);
      agent.logToWeb('BinanceTrade', 'WARNING', `${targetSymbol} exposure limit hit — skipped`);
      saveBinanceTradeState(state, agentMode);
      return;
    }

    // --- DRY RUN → record mock open position ---
    if (isDryRun) {
      console.log(`🔍 [BinanceMockTrade - ${agentMode}] DRY RUN — simulated open: ${signal} on ${targetSymbol} (Spot: $${spotUsdt}, Futures: ${futLeverage}x $${futUsdt})`);
      state.openPositions.push({
        symbol: targetSymbol, time: now.toISOString(), status: 'open',
        type: 'DRY_RUN', spotUsdt, futuresUsdt: futUsdt, leverage: futLeverage,
        entryPrice: 0, stopLoss: 0, takeProfit: 0, maxPnlPercent: 0,
        signal: signal, fngValue,
        pillarsPassed: auditResult.passedPillars, pillarScores, pillarsDetail: pillarsPassed,
        matchedKeywords: auditResult.matchedKeywords || [],
        finalSignalStrength: auditResult.finalSignalStrength || 0,
        overallSentimentStrength: auditResult.overallSentimentStrength || 0
      });
      state.stats.totalTrades++;
      state.stats.dailyTradeCount++;
      state.stats.weeklyTradeCount++;
      agent.logToWeb('BinanceTrade', 'INFO', `DRY RUN ${targetSymbol} ${signal}: Spot $${spotUsdt} + Futures ${futLeverage}x $${futUsdt}`);
      saveBinanceTradeState(state, agentMode);
      return;
    }

    // --- 1. Spot market buy (LONG only) ---
    let spotResult = { success: true, orderId: null, executedQty: 0, mode: 'PAPER_MOCK' };
    if (signal === 'LONG' && spotUsdt > 0) {
      console.log(`✅ [BinanceMockTrade - ${agentMode}] Executing Spot BUY...`);
      spotResult = await binanceTrader.executeSpotOrder(`${targetSymbol}USDT`, 'BUY', spotUsdt);
      if (!spotResult.success) {
        throw new Error(`Spot order failed: ${spotResult.error || 'unknown error'}`);
      }
    }

    // --- 2. Futures Position (LONG: BUY, SHORT: SELL) ---
    console.log(`✅ [BinanceMockTrade - ${agentMode}] Executing Futures ${signal} (${futLeverage}x)...`);
    const futSide = signal === 'SHORT' ? 'SELL' : 'BUY';
    const futuresResult = await binanceTrader.executeFuturesOrder(`${targetSymbol}USDT`, futSide, futUsdt, futLeverage);
    if (!futuresResult.success) {
      throw new Error(`Futures order failed: ${futuresResult.error || 'unknown error'}`);
    }
    const avgPrice = futuresResult.avgPrice || 0;

    // --- 3. Set STOP_MARKET stop loss order ---
    let stopOrderId = null;
    let stopPrice = 0;
    let takeProfitPrice = 0;
    if (avgPrice > 0) {
      const slPct = brainAdjustments.STOP_LOSS_PCT !== undefined ? Math.abs(brainAdjustments.STOP_LOSS_PCT) : Math.abs(modeParams.STOP_LOSS_PCT || 0.05);
      const tpPct = brainAdjustments.TAKE_PROFIT_PCT !== undefined ? brainAdjustments.TAKE_PROFIT_PCT : (modeParams.TAKE_PROFIT_PCT || 0.10);
      
      if (signal === 'SHORT') {
        stopPrice = parseFloat((avgPrice * (1 + slPct)).toFixed(2));
        takeProfitPrice = parseFloat((avgPrice * (1 - tpPct)).toFixed(2));
      } else {
        stopPrice = parseFloat((avgPrice * (1 - slPct)).toFixed(2));
        takeProfitPrice = parseFloat((avgPrice * (1 + tpPct)).toFixed(2));
      }

      const slSide = signal === 'SHORT' ? 'BUY' : 'SELL';
      const slResult = await binanceTrader.setFuturesStopLoss(
        `${targetSymbol}USDT`, slSide,
        futuresResult.executedQty, stopPrice
      );
      if (!slResult.success) {
        throw new Error(`Stop-loss order failed: ${slResult.error || 'unknown error'}`);
      }
      stopOrderId = slResult.orderId;
      console.log(`🎯 [BinanceMockTrade - ${agentMode}] ${targetSymbol} SL set @ ${stopPrice} / TP ${takeProfitPrice}`);
      agent.logToWeb('BinanceTrade', 'SUCCESS', `${targetSymbol} SL @ ${stopPrice} (order #${stopOrderId})`);
    }

    // --- 4. Record position ---
    state.openPositions.push({
      symbol: targetSymbol, time: now.toISOString(), status: 'open',
      type: 'LIVE', spotOrderId: spotResult.orderId,
      futuresOrderId: futuresResult.orderId, stopOrderId,
      spotUsdt, futuresUsdt: futUsdt, leverage: futLeverage,
      entryPrice: avgPrice, stopLoss: stopPrice, takeProfit: takeProfitPrice, maxPnlPercent: 0,
      executedQtySpot: spotResult.executedQty || 0,
      executedQtyFutures: futuresResult.executedQty || 0,
      pillarsPassed: auditResult.passedPillars, pillarScores, pillarsDetail: pillarsPassed,
      signal: signal, fngValue,
      matchedKeywords: auditResult.matchedKeywords || [],
      spotMode: spotResult.mode, futuresMode: futuresResult.mode,
      finalSignalStrength: auditResult.finalSignalStrength || 0,
      overallSentimentStrength: auditResult.overallSentimentStrength || 0
    });
    state.stats.totalTrades++;
    state.stats.dailyTradeCount++;
    state.stats.weeklyTradeCount++;
    console.log(`✅ [BinanceMockTrade - ${agentMode}] ${targetSymbol} ${signal} done — Spot #${spotResult.orderId || 'none'} / Futures #${futuresResult.orderId} / SL #${stopOrderId || 'none'}`);
    agent.logToWeb('BinanceTrade', 'SUCCESS', `${targetSymbol} ${signal} Spot $${spotUsdt} + Futures ${futLeverage}x $${futUsdt}`);

  } catch (err) {
    console.error(`❌ [BinanceMockTrade - ${agentMode}] Error:`, err.message);
    agent.logToWeb('BinanceTrade', 'ERROR', `${targetSymbol} error: ${err.message}`);

    // Blacklist increment on consecutive failures
    if (state.blacklist[targetSymbol]) {
      state.blacklist[targetSymbol].consecutiveLosses = (state.blacklist[targetSymbol].consecutiveLosses || 0) + 1;
      const maxLosses = config.BINANCE_TRADE_BLACKLIST_MAX_LOSSES || 3;
      if (state.blacklist[targetSymbol].consecutiveLosses >= maxLosses) {
        const cooldownMs = (config.BINANCE_TRADE_BLACKLIST_COOLDOWN_HOURS || 24) * 3600000;
        state.blacklist[targetSymbol].cooldownUntil = Date.now() + cooldownMs;
        console.log(`⛔ [BinanceMockTrade - ${agentMode}] ${targetSymbol} blacklisted for ${config.BINANCE_TRADE_BLACKLIST_COOLDOWN_HOURS || 24}h (${maxLosses} consecutive losses)`);
        agent.logToWeb('BinanceTrade', 'WARNING', `${targetSymbol} blacklisted ${config.BINANCE_TRADE_BLACKLIST_COOLDOWN_HOURS || 24}h`);
      }
    }
  }

  saveBinanceTradeState(state, agentMode);

  // Refresh dashboard
  try {
    await agent.updateWebDashboard(agent.loadPositions());
  } catch (_) {}
}

module.exports = {
  checkAndCloseBinancePositions,
  binanceMockTradeLoop
};
