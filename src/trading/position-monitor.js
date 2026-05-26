const fs = require('fs');
const path = require('path');
const config = require('../config');
const brain = require('../brain');
const chartRenderer = require('../chart_renderer');

class PositionMonitor {
  constructor(agent) {
    this.agent = agent;
  }

  /**
   * Monitor existing positions for take-profit, stop-loss, or timeout and execute sell swap.
   */
  async checkPositionsAndSell(isLive = false) {
    console.log(`\n--- 📊 [DegenTerminal - ${this.agent.mode.toUpperCase()}] 啟動自動持倉監控與賣出引擎 ---`);
    this.agent.logToWeb('Trader', 'INFO', 'Starting autonomous portfolio monitoring...');
    
    let positions = this.agent.portfolioManager.loadPositions();
    if (positions.length === 0) {
      console.log(`[DegenTerminal - ${this.agent.mode.toUpperCase()}] 當前無任何持有倉位。`);
      this.agent.logToWeb('Trader', 'INFO', 'No active positions held in wallet.');
      return;
    }

    const updatedPositions = [];
    const adjustedConfig = brain.getStrategyAdjustments(this.agent.mode);
    const TIMEOUT_MS = adjustedConfig.TIMEOUT_MINUTES * 60 * 1000;

    for (const pos of positions) {
      console.log(`\n🔍 [持倉檢查] 代幣: $${pos.symbol} | 買入SOL: ${pos.buyPriceSol} | 持有時間: ${Math.floor((Date.now() - pos.buyTime) / 60000)} 分鐘`);
      this.agent.logToWeb('Trader', 'INFO', `Monitoring $${pos.symbol} | Hold time: ${Math.floor((Date.now() - pos.buyTime) / 60000)}m`);
      
      // Ensure priceHistory exists
      if (!pos.priceHistory) {
        pos.priceHistory = [];
      }
      
      // Seed initial buy price point if history is empty
      if (pos.priceHistory.length === 0) {
        pos.priceHistory.push({
          time: new Date(pos.buyTime).toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          price: pos.buyPriceUSD || 1000.00
        });
      }

      let shouldSell = false;
      let reason = '';
      let currentSolVal = pos.buyPriceSol;
      let pnlPercent = '0.00';
      let pnlRatio = 0;
      let checkSuccess = false;

      // Delegate to Price Engine
      try {
        const priceInfo = await this.agent.priceEngine.getLivePnlRatio(pos);
        pnlRatio = priceInfo.pnlRatio;
        pnlPercent = priceInfo.pnlPercent;
        currentSolVal = priceInfo.currentSolVal;
        checkSuccess = priceInfo.success;
      } catch (err) {
        console.error(`[PositionMonitor Error] Price check failed for $${pos.symbol}:`, err.message);
      }

      // === Unified Risk Control Engine (Profitability & Risk Shield) ===
      if (checkSuccess) {
        const currentPnlVal = parseFloat(pnlPercent);
        
        // 1. Dynamic trailing stop calculation (keep track of maximum float PnL)
        pos.maxPnlPercent = Math.max(parseFloat(pos.maxPnlPercent || 0), currentPnlVal);
        
        let isTrailingTriggered = false;
        let trailingReason = '';
        
        if (adjustedConfig.TRAILING_STOP_TRIGGER_PCT !== undefined && adjustedConfig.TRAILING_STOP_RETRACT_PCT !== undefined) {
          const triggerPct = adjustedConfig.TRAILING_STOP_TRIGGER_PCT * 100; // e.g. 12.0
          const retractPct = adjustedConfig.TRAILING_STOP_RETRACT_PCT * 100; // e.g. 3.5
          
          if (pos.maxPnlPercent >= triggerPct) {
            const drawdown = pos.maxPnlPercent - currentPnlVal;
            console.log(`🔄 [尾隨止盈監控] $${pos.symbol} 歷史最高浮盈: ${pos.maxPnlPercent.toFixed(2)}% | 當前浮盈: ${currentPnlVal.toFixed(2)}% | 當前自高點回撤: ${drawdown.toFixed(2)}% (回撤賣出線: ${retractPct.toFixed(2)}%)`);
            
            if (drawdown >= retractPct) {
              isTrailingTriggered = true;
              trailingReason = 'TRAILING_STOP 🔄';
            }
          }
        }

        // 2. Decide if sell is triggered
        if (isTrailingTriggered) {
          shouldSell = true;
          reason = trailingReason;
        } else if (pnlRatio >= adjustedConfig.TAKE_PROFIT_PCT) {
          shouldSell = true;
          reason = 'TAKE_PROFIT 🟢';
        } else if (pnlRatio <= adjustedConfig.STOP_LOSS_PCT) {
          shouldSell = true;
          reason = 'STOP_LOSS 🔴';
        }
      }

      // Track price history with precision-checked current USD value
      const buyPriceUSD = pos.buyPriceUSD || 1000.00;
      let currentValUSD = buyPriceUSD * (1 + pnlRatio);
      const timeStr = new Date().toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      const lastPoint = pos.priceHistory[pos.priceHistory.length - 1];
      if (!lastPoint || lastPoint.time !== timeStr || lastPoint.price !== currentValUSD) {
        pos.priceHistory.push({
          time: timeStr,
          price: currentValUSD
        });
      }

      // Check timeout condition
      const holdTime = Date.now() - pos.buyTime;
      const customTimeoutMs = pos.maxHoldMinutes ? (pos.maxHoldMinutes * 60 * 1000) : TIMEOUT_MS;
      if (!shouldSell && holdTime >= customTimeoutMs) {
        shouldSell = true;
        reason = 'TIMEOUT_EXPIRED ⏳';
        if (pnlRatio === 0) {
          pnlRatio = -0.02; // Minor slip fallback
          pnlPercent = '-2.00';
          pos.lastPnlPercent = pnlPercent;
          currentValUSD = buyPriceUSD * (1 + pnlRatio);
        }
      }

      if (shouldSell) {
        console.log(`🚨 [觸發賣出] 滿足賣出條件! 原因: ${reason}`);
        this.agent.logToWeb('Trader', 'WARNING', `Triggered liquidation for $${pos.symbol} (Reason: ${reason.split(' ')[0]})`);
        
        try {
          // Liquidation sell: use higher slippage from config (default 150 bps = 1.5%) to guarantee execution
          const sellSlippageBps = Math.max(150, config.SLIPPAGE_BPS || 150);
          const sellResult = await this.agent.trader.executeSwap(pos.address, 0, false, pos.rawAmountOut, sellSlippageBps);
          
          if (sellResult && sellResult.success) {
            const finalPnlPercent = pnlPercent;
            const holdMinutes = Math.floor(holdTime / 60000);
            
            // --- 虛擬盤盈虧結算與滾動加回 ---
            if (!this.agent.portfolioManager.virtualPortfolio) {
              this.agent.portfolioManager.loadVirtualPortfolio();
            }
            const realizedPnlUSD = buyPriceUSD * pnlRatio;
            const finalValueUSD = buyPriceUSD + realizedPnlUSD;
            
            this.agent.portfolioManager.virtualPortfolio.balanceUSD += finalValueUSD;
            this.agent.portfolioManager.virtualPortfolio.totalProfitUSD += realizedPnlUSD;
            this.agent.portfolioManager.saveVirtualPortfolio();
            // ---------------------------------
            
            // --- Archive closed trade to history ---
            try {
              const historyPath = this.agent.portfolioManager.getTradeHistoryPath();
              let history = [];
              if (fs.existsSync(historyPath)) {
                history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
              }
              history.push({
                symbol: pos.symbol,
                name: pos.name,
                address: pos.address,
                buyPriceUSD: buyPriceUSD,
                sellPriceUSD: currentValUSD,
                pnlPercent: parseFloat(finalPnlPercent),
                pnlUSD: realizedPnlUSD,
                reason: reason.split(' ')[0],
                holdMinutes: holdMinutes,
                buyTime: pos.buyTime,
                sellTime: Date.now(),
                mode: pos.mode || 'PAPER'
              });
              fs.writeFileSync(historyPath, JSON.stringify(history, null, 2), 'utf8');
              console.log(`[DegenTerminal - ${this.agent.mode.toUpperCase()}] Trade archived to history. Total closed trades: ${history.length}`);
            } catch (histErr) {
              console.error(`[DegenTerminal - ${this.agent.mode}] Failed to archive trade history:`, histErr.message);
            }
            // ----------------------------------------

            // Set cooldown on scanner for this token
            if (this.agent.scanner && this.agent.scanner.setCooldown) {
              this.agent.scanner.setCooldown(pos.address);
            }
            
            // Build viral PnL Report Tweet via self-reflection diary
            const closedTradeRecord = {
              symbol: pos.symbol,
              name: pos.name,
              address: pos.address,
              buyPriceUSD: buyPriceUSD,
              sellPriceUSD: currentValUSD,
              pnlPercent: parseFloat(finalPnlPercent),
              pnlUSD: realizedPnlUSD,
              reason: reason.split(' ')[0],
              holdMinutes: holdMinutes,
              buyTime: pos.buyTime,
              sellTime: Date.now(),
              mode: pos.mode || 'PAPER'
            };
            const postText = await brain.performSelfReflection(closedTradeRecord);
            
            console.log('\n--- [Generated Autonomous PnL Tweet] ---');
            console.log(postText);
            console.log('----------------------------------------');
            
            const formattedRealizedUSD = `${realizedPnlUSD >= 0 ? '+' : ''}${realizedPnlUSD.toFixed(2)}`;
            const formattedPnlPercent = `${parseFloat(finalPnlPercent) >= 0 ? '+' : ''}${parseFloat(finalPnlPercent).toFixed(2)}`;
            this.agent.logToWeb('Trader', 'SUCCESS', `Liquidated $${pos.symbol} for ${formattedRealizedUSD} USD PnL (${formattedPnlPercent}%)`);

            // Generate PnL Chart Attachment
            const chartFilename = `chart_${pos.symbol}_${Date.now()}.png`;
            const chartPath = path.join(__dirname, `../../public/${chartFilename}`);
            let hasChart = false;
            
            try {
              console.log(`[DegenTerminal] Generating visual PnL chart for $${pos.symbol}...`);
              await chartRenderer.generateChart(pos.symbol, pos.priceHistory, chartPath);
              hasChart = true;
              console.log(`[DegenTerminal] Visual PnL chart generated at: ${chartPath}`);
            } catch (chartErr) {
              console.error('[DegenTerminal Error] Failed to generate visual PnL chart:', chartErr.message);
            }

            if (isLive) {
              console.log('[Live Mode] Posting PnL report to Twitter/X...');
              this.agent.logToWeb('Twitter', 'INFO', 'Posting PnL report to Twitter/X...');
              await this.agent.twitter.postTweet(postText, hasChart ? chartPath : null);
              console.log('[Live Mode] PnL report posted successfully!');
              this.agent.logToWeb('Twitter', 'SUCCESS', 'PnL report published successfully on X.com!');
              
              // Clean up temporary chart file
              if (hasChart && fs.existsSync(chartPath)) {
                try {
                  fs.unlinkSync(chartPath);
                  console.log(`[DegenTerminal] Recycled temporary chart file: ${chartPath}`);
                } catch (delErr) {
                  console.error('[DegenTerminal Error] Failed to delete temporary chart file:', delErr.message);
                }
              }
            }
          }
        } catch (sellErr) {
          console.error(`❌ [賣出失敗] 無法自動清算 $${pos.symbol}:`, sellErr.message);
          this.agent.logToWeb('Trader', 'ERROR', `Liquidation swap failed for $${pos.symbol}: ${sellErr.message}`);
          // Keep position to retry next time
          updatedPositions.push(pos);
        }
      } else {
        // Keep active holding position
        updatedPositions.push(pos);
      }
    }

    await this.agent.portfolioManager.savePositions(updatedPositions);
    console.log('--- 📊 [持倉監控與賣出檢查結束] ---\n');
  }
}

module.exports = PositionMonitor;
