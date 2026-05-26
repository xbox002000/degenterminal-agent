const axios = require('axios');
const crypto = require('crypto');
const config = require('../../config');

class BinanceTrader {
  constructor() {
    this.apiKey = process.env.BINANCE_TESTNET_API_KEY;
    this.secretKey = process.env.BINANCE_TESTNET_SECRET_KEY;
    
    this.spotUrl = config.binanceTestnet?.spotBaseUrl || 'https://testnet.binance.vision/api';
    this.futuresUrl = config.binanceTestnet?.futuresBaseUrl || 'https://demo-fapi.binance.com';
    this.defaultLeverage = config.binanceTestnet?.defaultLeverage || 5;
  }

  /**
   * Check if both API Key and Secret Key are configured
   */
  isConfigured(type = 'futures') {
    if (type === 'spot') {
      const key = process.env.BINANCE_SPOT_TESTNET_API_KEY || process.env.BINANCE_TESTNET_API_KEY;
      const secret = process.env.BINANCE_SPOT_TESTNET_API_SECRET || process.env.BINANCE_TESTNET_SECRET_KEY;
      return !!key && key.trim() !== '' && !!secret && secret.trim() !== '';
    }
    return !!this.apiKey && this.apiKey.trim() !== '' && !!this.secretKey && this.secretKey.trim() !== '';
  }

  /**
   * Generate HMAC-SHA256 signature for Binance API signing
   */
  generateSignature(queryString, type = 'futures') {
    const secret = type === 'spot'
      ? (process.env.BINANCE_SPOT_TESTNET_API_SECRET || process.env.BINANCE_TESTNET_SECRET_KEY)
      : this.secretKey;
    if (!secret) return '';
    return crypto
      .createHmac('sha256', secret)
      .update(queryString)
      .digest('hex');
  }

  /**
   * Execute Spot Order on Binance Spot Testnet (testnet.binance.vision)
   */
  /**
   * Execute Spot Order on Binance Spot Testnet (testnet.binance.vision)
   */
  async executeSpotOrder(symbol = 'BTCUSDT', side = 'BUY', usdtAmount = 500, quantity = null) {
    const uppercaseSymbol = symbol.toUpperCase();
    const uppercaseSide = side.toUpperCase();
    
    console.log(`\n--- 📈 [Binance Spot Testnet] 執行現貨下單: ${uppercaseSide} ${uppercaseSymbol} (金額: ${usdtAmount} USDT, 數量: ${quantity || '自動計算'}) ---`);

    if (!this.isConfigured('spot')) {
      console.warn('[Binance Spot Testnet] API key missing. Using paper mock fill.');
      return this.simulateSpotOrder(uppercaseSymbol, uppercaseSide, usdtAmount, quantity);
    }

    try {
      const timestamp = Date.now();
      // We will place a MARKET order. For BUY, we specify quoteOrderQty. For SELL, we specify quantity.
      let queryString = `symbol=${uppercaseSymbol}&side=${uppercaseSide}&type=MARKET&recvWindow=5000&timestamp=${timestamp}`;
      if (uppercaseSide === 'BUY') {
        queryString += `&quoteOrderQty=${usdtAmount}`;
      } else {
        let qty = quantity;
        if (!qty) {
          const markPrice = await this.getMarkPrice(uppercaseSymbol);
          const rawQty = usdtAmount / markPrice;
          qty = uppercaseSymbol.includes('BTC') ? rawQty.toFixed(6) : (uppercaseSymbol.includes('ETH') ? rawQty.toFixed(4) : rawQty.toFixed(2));
        }
        queryString += `&quantity=${qty}`;
      }

      const signature = this.generateSignature(queryString, 'spot');
      const url = `${this.spotUrl}/v3/order?${queryString}&signature=${signature}`;

      console.log(`🚀 [Binance Spot] 正在向 Testnet 發送真實 REST 請求...`);
      const response = await axios.post(url, null, {
        headers: { 'X-MBX-APIKEY': process.env.BINANCE_SPOT_TESTNET_API_KEY || this.apiKey },
        timeout: 10000
      });

      const resData = response.data;
      console.log(`✅ [Binance Spot Testnet] 下單成功！`);
      console.log(`• 訂單 ID: ${resData.orderId}`);
      console.log(`• 交易狀態: ${resData.status}`);
      console.log(`• 成交數量: ${resData.executedQty} (均價: ${resData.cummulativeQuoteQty / resData.executedQty})`);

      return {
        success: true,
        mode: 'LIVE_TESTNET',
        orderId: resData.orderId,
        status: resData.status,
        executedQty: parseFloat(resData.executedQty),
        cost: parseFloat(resData.cummulativeQuoteQty),
        rawResponse: resData
      };

    } catch (error) {
      let errorMsg = error.message;
      if (error.response && error.response.data) {
        errorMsg = JSON.stringify(error.response.data);
      }
      console.error(`❌ [Binance Spot Testnet Error] 實戰下單失敗:`, errorMsg);
      console.warn('[Binance Spot Testnet] Live testnet order failed. Not recording a mock fill.');
      return { success: false, mode: 'LIVE_TESTNET_ERROR', error: errorMsg };
    }
  }

  /**
   * Simulate Spot Order (High Fidelity Fallback)
   */
  simulateSpotOrder(symbol, side, usdtAmount, quantity = null) {
    const mockOrderId = Math.floor(Math.random() * 10000000);
    const approxPrices = { BTCUSDT: 68500, ETHUSDT: 3450, SOLUSDT: 172, JUPUSDT: 1.05, BNBUSDT: 610 };
    const price = approxPrices[symbol] || 100;
    const qty = quantity || (usdtAmount / price).toFixed(6);

    console.log(`✅ [Simulated Binance Spot] 仿真現貨下單成功！`);
    console.log(`• 訂單 ID: ${mockOrderId}`);
    console.log(`• 交易狀態: FILLED`);
    console.log(`• 模擬成交數量: ${qty} ${symbol.replace('USDT', '')} (均價: ${price})`);

    return {
      success: true,
      mode: 'PAPER_MOCK',
      orderId: mockOrderId,
      status: 'FILLED',
      executedQty: parseFloat(qty),
      cost: usdtAmount,
      rawResponse: null
    };
  }

  /**
   * Execute Futures Order on Binance Futures Testnet (demo-fapi.binance.com)
   */
  async executeFuturesOrder(symbol = 'BTCUSDT', side = 'BUY', usdtAmount = 500, leverage = 5, quantity = null) {
    const uppercaseSymbol = symbol.toUpperCase();
    const uppercaseSide = side.toUpperCase();
    
    console.log(`\n--- 📈 [Binance Futures Testnet] 執行合約開倉: ${uppercaseSide} ${uppercaseSymbol} (槓桿: ${leverage}x, 部位: ${usdtAmount} USDT, 數量: ${quantity || '自動計算'}) ---`);

    if (!this.isConfigured()) {
      console.warn('[Binance Futures Testnet] API key missing. Using paper mock fill.');
      return this.simulateFuturesOrder(uppercaseSymbol, uppercaseSide, usdtAmount, leverage, quantity);
    }

    try {
      const timestamp = Date.now();
      
      // 1. Adjust leverage first to ensure target leverage is active
      console.log(`🚀 [Binance Futures] 正在設置合約槓桿為 ${leverage}x...`);
      const leverageQuery = `symbol=${uppercaseSymbol}&leverage=${leverage}&timestamp=${timestamp}`;
      const levSig = this.generateSignature(leverageQuery);
      try {
        await axios.post(`${this.futuresUrl}/fapi/v1/leverage?${leverageQuery}&signature=${levSig}`, null, {
          headers: { 'X-MBX-APIKEY': this.apiKey },
          timeout: 8000
        });
        console.log(`✅ [Binance Futures] 槓桿調整成功！`);
      } catch (levErr) {
        console.warn(`[Binance Futures Warning] 調整槓桿可能因已是當前槓桿而拒絕: ${levErr.message}`);
      }

      // 2. Determine quantity based on params or ticker price
      let qty = quantity;
      if (!qty) {
        const tickerRes = await axios.get(`${this.futuresUrl}/fapi/v1/ticker/price?symbol=${uppercaseSymbol}`);
        const price = parseFloat(tickerRes.data.price);
        // Futures contracts quantity = (USDT * leverage) / price
        const rawQty = (usdtAmount * leverage) / price;
        // Format quantity precision (BTC/ETH have 3 decimals precision, others like SOL/BNB have 2)
        qty = (uppercaseSymbol.includes('BTC') || uppercaseSymbol.includes('ETH')) ? rawQty.toFixed(3) : rawQty.toFixed(2);
      }

      // 3. Place Market Order
      const timestampOrder = Date.now();
      const orderQuery = `symbol=${uppercaseSymbol}&side=${uppercaseSide}&type=MARKET&quantity=${qty}&timestamp=${timestampOrder}`;
      const orderSig = this.generateSignature(orderQuery);

      console.log(`🚀 [Binance Futures] 正在發送合約開倉真實 REST 請求...`);
      const orderRes = await axios.post(`${this.futuresUrl}/fapi/v1/order?${orderQuery}&signature=${orderSig}`, null, {
        headers: { 'X-MBX-APIKEY': this.apiKey },
        timeout: 10000
      });

      const resData = orderRes.data;
      console.log(`✅ [Binance Futures Testnet] U本位合約建倉成功！`);
      console.log(`• 訂單 ID: ${resData.orderId}`);
      console.log(`• 合約類型: ${resData.side} ${resData.positionSide || 'BOTH'}`);
      console.log(`• 成交合約數: ${resData.origQty} (開倉均價: ${resData.avgPrice})`);

      let avgPrice = parseFloat(resData.avgPrice || 0);
      if (avgPrice === 0) {
        try {
          console.log(`🔍 [Binance Futures] 成交價格為 0，正在查詢交易所持倉以獲取實際入場均價...`);
          // Give exchange a brief moment to process the order
          await new Promise(resolve => setTimeout(resolve, 800));
          const accountInfo = await this.getFuturesAccountInfo();
          const matchedPos = accountInfo.positions.find(p => p.symbol === uppercaseSymbol);
          if (matchedPos && matchedPos.entryPrice > 0) {
            avgPrice = matchedPos.entryPrice;
            console.log(`🎯 [Binance Futures] 從持倉資訊中成功取得實際入場均價: ${avgPrice}`);
          } else {
            avgPrice = await this.getMarkPrice(uppercaseSymbol);
            console.log(`⚠️ [Binance Futures] 無法從持倉取得均價，退回使用當前標記價格: ${avgPrice}`);
          }
        } catch (posErr) {
          avgPrice = await this.getMarkPrice(uppercaseSymbol);
          console.warn(`[Binance Futures Warning] 獲取持倉均價出錯，退回使用當前標記價格: ${avgPrice}`, posErr.message);
        }
      }

      return {
        success: true,
        mode: 'LIVE_TESTNET',
        orderId: resData.orderId,
        status: resData.status,
        executedQty: parseFloat(resData.origQty),
        avgPrice: avgPrice,
        rawResponse: resData
      };

    } catch (error) {
      let errorMsg = error.message;
      if (error.response && error.response.data) {
        errorMsg = JSON.stringify(error.response.data);
      }
      console.error(`❌ [Binance Futures Testnet Error] 實戰合約開倉失敗:`, errorMsg);
      console.warn('[Binance Futures Testnet] Live testnet order failed. Not recording a mock fill.');
      return { success: false, mode: 'LIVE_TESTNET_ERROR', error: errorMsg };
    }
  }

  /**
   * Simulate Futures Order (High Fidelity Fallback)
   */
  simulateFuturesOrder(symbol, side, usdtAmount, leverage, quantity = null) {
    const mockOrderId = Math.floor(Math.random() * 20000000);
    const approxPrices = { BTCUSDT: 68500, ETHUSDT: 3450, SOLUSDT: 172, JUPUSDT: 1.05, BNBUSDT: 610 };
    const price = approxPrices[symbol] || 100;
    const rawQty = (usdtAmount * leverage) / price;
    const qty = quantity || ((symbol.includes('BTC') || symbol.includes('ETH')) ? rawQty.toFixed(3) : rawQty.toFixed(2));

    console.log(`✅ [Simulated Binance Futures] 仿真期期貨建倉成功！`);
    console.log(`• 訂單 ID: ${mockOrderId}`);
    console.log(`• 合約類型: ${side} (雙向/單向模式)`);
    console.log(`• 模擬成交合約數: ${qty} (開倉均價: ${price})`);

    return {
      success: true,
      mode: 'PAPER_MOCK',
      orderId: mockOrderId,
      status: 'NEW',
      executedQty: parseFloat(qty),
      avgPrice: price,
      rawResponse: null
    };
  }

  /**
   * Close an open Futures position
   */
  async closeFuturesPosition(symbol, side, quantity) {
    const uppercaseSymbol = symbol.toUpperCase();
    const closeSide = side.toUpperCase() === 'BUY' ? 'SELL' : 'BUY';
    console.log(`\n--- 📉 [Binance Futures] 執行合約平倉: ${closeSide} ${uppercaseSymbol} (數量: ${quantity}) ---`);
    
    if (!this.isConfigured()) {
      console.log(`💡 [Binance Futures] 模擬合約平倉成功 (模擬紙盤)。`);
      return { success: true, mode: 'PAPER_MOCK' };
    }

    try {
      const timestamp = Date.now();
      const orderQuery = `symbol=${uppercaseSymbol}&side=${closeSide}&type=MARKET&quantity=${quantity}&reduceOnly=true&timestamp=${timestamp}`;
      const orderSig = this.generateSignature(orderQuery);

      const response = await axios.post(
        `${this.futuresUrl}/fapi/v1/order?${orderQuery}&signature=${orderSig}`,
        null,
        { headers: { 'X-MBX-APIKEY': this.apiKey }, timeout: 10000 }
      );
      console.log(`✅ [Binance Futures] U本位合約平倉成功！`);
      return { success: true, mode: 'LIVE_TESTNET', rawResponse: response.data };
    } catch (error) {
      let errorMsg = error.message;
      if (error.response && error.response.data) errorMsg = JSON.stringify(error.response.data);
      console.error(`❌ [Binance Futures Error] 合約平倉失敗:`, errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Cancel an open Futures order (like a Stop Loss)
   */
  async cancelFuturesOrder(symbol, orderId) {
    const uppercaseSymbol = symbol.toUpperCase();
    console.log(`\n--- 🛑 [Binance Futures] 撤銷訂單: ${uppercaseSymbol} #${orderId} ---`);

    if (!this.isConfigured() || !orderId) {
      return { success: true, mode: 'PAPER_MOCK' };
    }

    try {
      const timestamp = Date.now();
      const queryString = `symbol=${uppercaseSymbol}&orderId=${orderId}&timestamp=${timestamp}`;
      const signature = this.generateSignature(queryString);

      const response = await axios.delete(
        `${this.futuresUrl}/fapi/v1/order?${queryString}&signature=${signature}`,
        { headers: { 'X-MBX-APIKEY': this.apiKey }, timeout: 10000 }
      );
      console.log(`✅ [Binance Futures] 訂單撤銷成功！`);
      return { success: true, mode: 'LIVE_TESTNET', rawResponse: response.data };
    } catch (error) {
      let errorMsg = error.message;
      if (error.response && error.response.data) errorMsg = JSON.stringify(error.response.data);
      console.error(`❌ [Binance Futures Error] 撤單失敗:`, errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Set Stop Loss on existing futures position (STOP_MARKET order)
   */
  async setFuturesStopLoss(symbol, side, quantity, stopPrice) {
    const uppercaseSymbol = symbol.toUpperCase();
    const stopSide = side.toUpperCase();

    console.log(`\n--- 🛑 [Binance Futures] 設置止損單: ${stopSide} ${uppercaseSymbol} @ ${stopPrice} (數量: ${quantity}) ---`);

    if (!this.isConfigured()) {
      console.warn(`💡 [Binance Futures] API Key 未配置。模擬止損記錄。`);
      return { success: true, mode: 'PAPER_MOCK', orderId: Math.floor(Math.random() * 30000000), status: 'NEW' };
    }

    try {
      const timestamp = Date.now();
      const queryString = `symbol=${uppercaseSymbol}&side=${stopSide}&type=STOP_MARKET&quantity=${quantity}&stopPrice=${stopPrice}&reduceOnly=true&timestamp=${timestamp}`;
      const signature = this.generateSignature(queryString);

      const response = await axios.post(
        `${this.futuresUrl}/fapi/v1/order?${queryString}&signature=${signature}`,
        null,
        { headers: { 'X-MBX-APIKEY': this.apiKey }, timeout: 10000 }
      );

      console.log(`✅ [Binance Futures] 止損單設置成功！`);
      console.log(`• 訂單 ID: ${response.data.orderId}`);
      console.log(`• 止損價格: ${stopPrice}`);
      return { success: true, mode: 'LIVE_TESTNET', orderId: response.data.orderId, status: response.data.status };
    } catch (error) {
      let errorMsg = error.message;
      if (error.response && error.response.data) errorMsg = JSON.stringify(error.response.data);
      console.error(`❌ [Binance Futures] 止損單設置失敗:`, errorMsg);
      console.warn(`💡 退回模擬止損記錄。`);
      return { success: false, mode: 'LIVE_TESTNET_ERROR', error: errorMsg };
    }
  }

  /**
   * Get Spot Account Balance (USDT)
   */
  async getSpotBalance() {
    if (!this.isConfigured('spot')) {
      return 10000.00; // Simulated Spot USDT balance
    }
    try {
      const timestamp = Date.now();
      const queryString = `recvWindow=5000&timestamp=${timestamp}`;
      const signature = this.generateSignature(queryString, 'spot');
      const url = `${this.spotUrl}/v3/account?${queryString}&signature=${signature}`;
      
      const response = await axios.get(url, {
        headers: { 'X-MBX-APIKEY': process.env.BINANCE_SPOT_TESTNET_API_KEY || this.apiKey },
        timeout: 5000
      });
      
      const usdtAsset = response.data.balances.find(b => b.asset === 'USDT');
      return usdtAsset ? parseFloat(usdtAsset.free) : 0.00;
    } catch (error) {
      console.warn(`[Binance Spot Balance Error] Using fallback: ${error.message}`);
      return 10000.00;
    }
  }

  /**
   * Get Futures Account Info (USDT Balance, Margin, Positions, etc.)
   */
  async getFuturesAccountInfo() {
    if (!this.isConfigured()) {
      return {
        balance: 15000.00,
        unrealizedPnL: 0.00,
        positions: [],
        openOrders: []
      };
    }
    try {
      const timestamp = Date.now();
      
      // Query Futures Balance
      const balQuery = `timestamp=${timestamp}`;
      const balSig = this.generateSignature(balQuery);
      const balRes = await axios.get(`${this.futuresUrl}/fapi/v2/balance?${balQuery}&signature=${balSig}`, {
        headers: { 'X-MBX-APIKEY': this.apiKey },
        timeout: 5000
      });
      const usdtBal = balRes.data.find(b => b.asset === 'USDT') || {};
      
      // Query Futures Positions Risk
      const posQuery = `timestamp=${timestamp}`;
      const posSig = this.generateSignature(posQuery);
      const posRes = await axios.get(`${this.futuresUrl}/fapi/v2/positionRisk?${posQuery}&signature=${posSig}`, {
        headers: { 'X-MBX-APIKEY': this.apiKey },
        timeout: 5000
      });
      
      // Filter out positions with positionAmt !== 0
      const activePositions = posRes.data
        .filter(p => parseFloat(p.positionAmt) !== 0)
        .map(p => ({
          symbol: p.symbol,
          positionAmt: parseFloat(p.positionAmt),
          entryPrice: parseFloat(p.entryPrice),
          markPrice: parseFloat(p.markPrice),
          unRealizedProfit: parseFloat(p.unRealizedProfit),
          liquidationPrice: parseFloat(p.liquidationPrice),
          leverage: parseInt(p.leverage),
          marginType: p.marginType
        }));

      // Query Futures Open Orders
      const ordQuery = `timestamp=${timestamp}`;
      const ordSig = this.generateSignature(ordQuery);
      const ordRes = await axios.get(`${this.futuresUrl}/fapi/v1/openOrders?${ordQuery}&signature=${ordSig}`, {
        headers: { 'X-MBX-APIKEY': this.apiKey },
        timeout: 5000
      });

      const openOrders = ordRes.data.map(o => ({
        orderId: o.orderId,
        symbol: o.symbol,
        side: o.side,
        type: o.type,
        price: parseFloat(o.price),
        origQty: parseFloat(o.origQty),
        executedQty: parseFloat(o.executedQty),
        status: o.status,
        time: o.time
      }));
      
      return {
        balance: parseFloat(usdtBal.balance || 0),
        unrealizedPnL: parseFloat(usdtBal.crossUnrealizedProfit || 0),
        positions: activePositions,
        openOrders: openOrders
      };
    } catch (error) {
      console.warn(`[Binance Futures Account Info Error] Using fallback: ${error.message}`);
      return {
        balance: 15000.00,
        unrealizedPnL: 0.00,
        positions: [],
        openOrders: []
      };
    }
  }

  /**
   * Get current mark price for a symbol (spot ticker)
   */
  async getMarkPrice(symbol = 'BTCUSDT') {
    const upper = symbol.toUpperCase();
    if (!this.isConfigured()) {
      const approxPrices = { BTCUSDT: 68500, ETHUSDT: 3450, SOLUSDT: 172, BNBUSDT: 610 };
      return approxPrices[upper] || 100;
    }
    try {
      const res = await axios.get(`${this.futuresUrl}/fapi/v1/ticker/price?symbol=${upper}`, { timeout: 5000 });
      return parseFloat(res.data.price);
    } catch (e) {
      try {
        const res = await axios.get(`${this.spotUrl}/v3/ticker/price?symbol=${upper}`, { timeout: 5000 });
        return parseFloat(res.data.price);
      } catch (e2) {
        console.warn(`[BinanceTrader] Failed to fetch price for ${upper}: ${e2.message}`);
        const approxPrices = { BTCUSDT: 68500, ETHUSDT: 3450, SOLUSDT: 172, BNBUSDT: 610 };
        return approxPrices[upper] || 100;
      }
    }
  }
}

module.exports = new BinanceTrader();
