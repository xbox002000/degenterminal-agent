const config = require('../../config');
const binanceTrader = require('../../binance_trader');
const smartMoneyStrategy = require('../../smart_money_strategy');
const {
  loadBinanceTradeState,
  saveBinanceTradeState,
  resetDailyCountIfNeeded,
  selectWeightedSymbol
} = require('./state-manager');

/**
 * Check all open Binance positions and close if:
 * - Mark price hit TAKE_PROFIT_PCT → win
 * - Mark price hit STOP_LOSS_PCT → loss
 * - Max hold time exceeded → force close
 */
async function checkAndCloseBinancePositions(agent) {
  const state = loadBinanceTradeState();
  if (!state.openPositions || state.openPositions.length === 0) return;

  const maxHoldMs = (config.BINANCE_TRADE_MAX_HOLD_HOURS || 48) * 3600000;
  const slPct = Math.abs(config.BINANCE_TRADE_STOP_LOSS_PCT || 0.05);
  const tpPct = config.BINANCE_TRADE_TAKE_PROFIT_PCT || 0.10;
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
      console.warn(`[BinanceClose] Failed to fetch mark price for ${pos.symbol}:`, e.message);
      continue;
    }

    const entryPrice = pos.entryPrice || markPrice;
    const pnlPct = entryPrice > 0 ? (markPrice - entryPrice) / entryPrice : 0;

    let reason = null;
    let result = null;

    // Check take profit
    if (pnlPct >= tpPct) {
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
      reason = `Max hold ${config.BINANCE_TRADE_MAX_HOLD_HOURS || 48}h exceeded`;
      result = pnlPct >= 0 ? 'win' : 'loss';
    }

    if (reason) {
      const spotPnL = pos.spotUsdt ? pos.spotUsdt * pnlPct : 0;
      const futPnL = pos.futuresUsdt ? pos.futuresUsdt * pnlPct * (pos.leverage || 1) : 0;

      const closed = {
        symbol: pos.symbol,
        openedAt: pos.time,
        closedAt: new Date().toISOString(),
        entryPrice: entryPrice,
        exitPrice: markPrice,
        pnlPct: parseFloat((pnlPct * 100).toFixed(2)),
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
        type: pos.type || 'LIVE'
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
          console.log(`⛔ [BinanceClose] ${pos.symbol} blacklisted for ${config.BINANCE_TRADE_BLACKLIST_COOLDOWN_HOURS || 24}h`);
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
      console.log(`🔒 [BinanceClose] ${pos.symbol} ${result.toUpperCase()} — ${reason} (PnL: ${closed.totalPnL >= 0 ? '+' : ''}$${closed.totalPnL})`);
      agent.logToWeb('BinanceTrade', result === 'win' ? 'SUCCESS' : 'WARNING', `Close ${pos.symbol} ${result.toUpperCase()} $${closed.totalPnL} — ${reason}`);
    }
  }

  if (changed) {
    saveBinanceTradeState(state);
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

  const isDryRun = config.BINANCE_TRADE_DRY_RUN === true;
  const state = loadBinanceTradeState();
  resetDailyCountIfNeeded(state);

  // --- Check daily/weekly limits ---
  if (state.stats.dailyTradeCount >= (config.BINANCE_TRADE_MAX_DAILY_TRADES || 3)) {
    console.log(`⏸️ [BinanceMockTrade] Daily trade limit reached (${state.stats.dailyTradeCount}/${config.BINANCE_TRADE_MAX_DAILY_TRADES}). Skipping.`);
    return;
  }
  if (state.stats.weeklyTradeCount >= (config.BINANCE_TRADE_MAX_WEEKLY_TRADES || 10)) {
    console.log(`⏸️ [BinanceMockTrade] Weekly trade limit reached (${state.stats.weeklyTradeCount}/${config.BINANCE_TRADE_MAX_WEEKLY_TRADES}). Skipping.`);
    return;
  }

  // --- Weighted symbol selection ---
  const targetSymbol = selectWeightedSymbol(state);
  if (!targetSymbol) {
    console.log(`⏸️ [BinanceMockTrade] All symbols blacklisted. Skipping.`);
    return;
  }

  const now = new Date();
  console.log(`\n💰 [${now.toLocaleTimeString()}] 啟動幣安 Testnet 模擬交易評估: ${targetSymbol}${isDryRun ? ' [DRY RUN]' : ''}`);

  try {
    // --- 5. Execute 5-pillar smart money strategy & record individual scores ---
    const auditResult = await smartMoneyStrategy.evaluateToken(targetSymbol);
    const details = auditResult.details || {};
    const pillarScores = {};
    const pillarNames = [];
    Object.keys(details).forEach(key => {
      const d = details[key];
      pillarScores[key] = d.score;
      pillarNames.push(`${d.name}: ${d.score === 1 ? '✅' : '❌'}`);
    });
    const pillarsPassed = Object.values(details).filter(d => d.score === 1).map(d => d.name).join('; ');

    console.log(`📊 [BinanceMockTrade] ${targetSymbol}: ${auditResult.passedPillars}/5 pillars passed`);
    pillarNames.forEach(n => console.log(`   ${n}`));
    agent.logToWeb('BinanceTrade', 'INFO', `${targetSymbol} ${auditResult.passedPillars}/5 — ${pillarsPassed || 'none'}`);

    if (!auditResult.success) {
      console.log(`⏸️ [BinanceMockTrade] ${targetSymbol} score ${auditResult.passedPillars}/5 < 4, skipped.`);
      saveBinanceTradeState(state);
      return;
    }

    // --- 6a. Calculate exposure: current open + proposed new ---
    const currentExposure = state.openPositions.filter(p => p.status === 'open').reduce((sum, p) => sum + (p.spotUsdt || 0) + (p.futuresUsdt || 0), 0);
    const maxExposure = config.BINANCE_TRADE_MAX_TOTAL_EXPOSURE_USDT || 2000;
    const spotUsdt = config.BINANCE_TRADE_SPOT_USDT || 500;
    const futUsdt = config.BINANCE_TRADE_FUTURES_USDT || 500;
    const totalNew = spotUsdt + futUsdt;

    if (currentExposure + totalNew > maxExposure) {
      console.log(`⏸️ [BinanceMockTrade] Exposure limit (current $${currentExposure} + new $${totalNew} > max $${maxExposure}). Skipping.`);
      agent.logToWeb('BinanceTrade', 'WARNING', `${targetSymbol} exposure $${currentExposure + totalNew} > $${maxExposure} — skipped`);
      saveBinanceTradeState(state);
      return;
    }

    const futLeverage = config.BINANCE_TRADE_FUTURES_LEVERAGE || 5;

    // --- 6b. DRY RUN → record mock open position ---
    if (isDryRun) {
      console.log(`🔍 [BinanceMockTrade] DRY RUN — simulated open: Spot BUY $${spotUsdt} + Futures LONG ${futLeverage}x $${futUsdt}`);
      state.openPositions.push({
        symbol: targetSymbol, time: now.toISOString(), status: 'open',
        type: 'DRY_RUN', spotUsdt, futuresUsdt: futUsdt, leverage: futLeverage,
        entryPrice: 0, stopLoss: 0, takeProfit: 0,
        pillarsPassed: auditResult.passedPillars, pillarScores, pillarsDetail: pillarsPassed
      });
      state.stats.totalTrades++;
      state.stats.dailyTradeCount++;
      state.stats.weeklyTradeCount++;
      agent.logToWeb('BinanceTrade', 'INFO', `DRY RUN ${targetSymbol}: Spot $${spotUsdt} + Futures ${futLeverage}x $${futUsdt}`);
      saveBinanceTradeState(state);
      return;
    }

    // --- 6c. Spot market buy ---
    console.log(`✅ [BinanceMockTrade] 5 pillar PASSED for ${targetSymbol}. Executing Spot...`);
    const spotResult = await binanceTrader.executeSpotOrder(`${targetSymbol}USDT`, 'BUY', spotUsdt);

    // --- 6d. Futures: set leverage → market long ---
    console.log(`✅ [BinanceMockTrade] Executing Futures LONG for ${targetSymbol}...`);
    const futuresResult = await binanceTrader.executeFuturesOrder(`${targetSymbol}USDT`, 'BUY', futUsdt, futLeverage);
    const avgPrice = futuresResult.avgPrice || 0;

    // --- 6e. Immediately set STOP_MARKET stop loss ---
    let stopOrderId = null;
    let stopPrice = 0;
    let takeProfitPrice = 0;
    if (avgPrice > 0) {
      const slPct = Math.abs(config.BINANCE_TRADE_STOP_LOSS_PCT || 0.05);
      const tpPct = config.BINANCE_TRADE_TAKE_PROFIT_PCT || 0.10;
      stopPrice = parseFloat((avgPrice * (1 - slPct)).toFixed(2));
      takeProfitPrice = parseFloat((avgPrice * (1 + tpPct)).toFixed(2));

      const slResult = await binanceTrader.setFuturesStopLoss(
        `${targetSymbol}USDT`, 'BUY',
        futuresResult.executedQty, stopPrice
      );
      stopOrderId = slResult.orderId;
      console.log(`🎯 [BinanceMockTrade] ${targetSymbol} SL set @ ${stopPrice} / TP ${takeProfitPrice}`);
      agent.logToWeb('BinanceTrade', 'SUCCESS', `${targetSymbol} SL @ ${stopPrice} (order #${stopOrderId})`);
    }

    // --- 6f. Record position ---
    state.openPositions.push({
      symbol: targetSymbol, time: now.toISOString(), status: 'open',
      type: 'LIVE', spotOrderId: spotResult.orderId,
      futuresOrderId: futuresResult.orderId, stopOrderId,
      spotUsdt, futuresUsdt: futUsdt, leverage: futLeverage,
      entryPrice: avgPrice, stopLoss: stopPrice, takeProfit: takeProfitPrice,
      pillarsPassed: auditResult.passedPillars, pillarScores, pillarsDetail: pillarsPassed,
      spotMode: spotResult.mode, futuresMode: futuresResult.mode
    });
    state.stats.totalTrades++;
    state.stats.dailyTradeCount++;
    state.stats.weeklyTradeCount++;
    console.log(`✅ [BinanceMockTrade] ${targetSymbol} done — Spot #${spotResult.orderId} / Futures #${futuresResult.orderId} / SL #${stopOrderId || 'none'}`);
    agent.logToWeb('BinanceTrade', 'SUCCESS', `${targetSymbol} Spot $${spotUsdt} + Futures ${futLeverage}x $${futUsdt}`);

  } catch (err) {
    console.error(`❌ [BinanceMockTrade] Error:`, err.message);
    agent.logToWeb('BinanceTrade', 'ERROR', `${targetSymbol} error: ${err.message}`);

    // Blacklist increment on consecutive failures
    if (state.blacklist[targetSymbol]) {
      state.blacklist[targetSymbol].consecutiveLosses = (state.blacklist[targetSymbol].consecutiveLosses || 0) + 1;
      const maxLosses = config.BINANCE_TRADE_BLACKLIST_MAX_LOSSES || 3;
      if (state.blacklist[targetSymbol].consecutiveLosses >= maxLosses) {
        const cooldownMs = (config.BINANCE_TRADE_BLACKLIST_COOLDOWN_HOURS || 24) * 3600000;
        state.blacklist[targetSymbol].cooldownUntil = Date.now() + cooldownMs;
        console.log(`⛔ [BinanceMockTrade] ${targetSymbol} blacklisted for ${config.BINANCE_TRADE_BLACKLIST_COOLDOWN_HOURS || 24}h (${maxLosses} consecutive losses)`);
        agent.logToWeb('BinanceTrade', 'WARNING', `${targetSymbol} blacklisted ${config.BINANCE_TRADE_BLACKLIST_COOLDOWN_HOURS || 24}h`);
      }
    }
  }

  saveBinanceTradeState(state);

  // Refresh dashboard
  try {
    await agent.updateWebDashboard(agent.loadPositions());
  } catch (_) {}
}

module.exports = {
  checkAndCloseBinancePositions,
  binanceMockTradeLoop
};
