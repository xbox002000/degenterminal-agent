const axios = require('axios');
const crypto = require('crypto');
const { Connection, VersionedTransaction, PublicKey } = require('@solana/web3.js');
const SecureWallet = require('../core/wallet');
const config = require('../config');

class JupiterTrader {
  /**
   * @param {SecureWallet} secureWallet - The secure wallet instance
   * @param {string} rpcUrl - Solana RPC Endpoint
   */
  constructor(secureWallet, rpcUrl) {
    this.wallet = secureWallet;
    const finalRpc = rpcUrl || config.RPC_URL;
    this.connection = new Connection(finalRpc, 'confirmed');
    this.wsoldMint = 'So11111111111111111111111111111111111111112';
    this.isPaperTrading = true;
    this.tokenDecimalsCache = new Map();
    
    console.log(`[JupiterTrader] Initialized with RPC: ${finalRpc}`);
  }

  /**
   * Retry wrapper with exponential backoff
   */
  async withRetry(fn, label = 'API call', maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        if (attempt === maxRetries) {
          console.error(`[JupiterTrader] ${label} failed after ${maxRetries} attempts: ${err.message}`);
          throw err;
        }
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
        console.warn(`[JupiterTrader] ${label} attempt ${attempt} failed: ${err.message}. Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  /**
   * Dynamically fetch token decimals from Solana RPC
   */
  async getTokenDecimals(mintAddress) {
    // SOL is always 9
    if (mintAddress === this.wsoldMint) return 9;
    
    // Check cache
    if (this.tokenDecimalsCache.has(mintAddress)) {
      return this.tokenDecimalsCache.get(mintAddress);
    }

    try {
      const mintPubkey = new PublicKey(mintAddress);
      const accountInfo = await this.connection.getParsedAccountInfo(mintPubkey);
      if (accountInfo.value && accountInfo.value.data && accountInfo.value.data.parsed) {
        const decimals = accountInfo.value.data.parsed.info.decimals;
        this.tokenDecimalsCache.set(mintAddress, decimals);
        console.log(`[JupiterTrader] Token ${mintAddress.slice(0,8)}... has ${decimals} decimals.`);
        return decimals;
      }
    } catch (err) {
      console.warn(`[JupiterTrader] Failed to fetch decimals for ${mintAddress.slice(0,8)}...: ${err.message}`);
    }
    
    // Default fallback
    this.tokenDecimalsCache.set(mintAddress, 6);
    return 6;
  }

  /**
   * Check wallet balance and decide between Live or Paper trading
   */
  async checkTradingMode(requiredSol = 0.05) {
    try {
      const pubKey = this.wallet.getSigner().publicKey;
      const lamports = await this.connection.getBalance(pubKey);
      const solBalance = lamports / 1e9;
      
      console.log(`[JupiterTrader] Current hot-wallet balance: ${solBalance.toFixed(4)} SOL`);
      
      if (solBalance < (requiredSol + config.GAS_BUFFER_SOL)) {
        console.log(`⚠️ [JupiterTrader] 餘額不足以進行真實交易 (需要 ${requiredSol + config.GAS_BUFFER_SOL} SOL)。`);
        console.log(`💡 [JupiterTrader] 系統將自動切換為「模擬交易模式 (Paper Trading)」跑通完整閉環！`);
        this.isPaperTrading = true;
      } else {
        console.log(`🚀 [JupiterTrader] 資金充足。系統將啟動「實戰鏈上交易模式」！`);
        this.isPaperTrading = false;
      }
    } catch (err) {
      console.warn(`[JupiterTrader Warning] Balance check failed (${err.message}). Defaulting to Paper Trading.`);
      this.isPaperTrading = true;
    }
    return this.isPaperTrading;
  }

  /**
   * Get Swap Quote from Jupiter with retry
   */
  async getQuote(inputMint, outputMint, amountInLamports, customSlippageBps = null) {
    const slippage = customSlippageBps !== null ? customSlippageBps : (config.SLIPPAGE_BPS || 100);
    return this.withRetry(async () => {
      const url = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountInLamports}&slippageBps=${slippage}`;
      const response = await axios.get(url, { timeout: 10000 });
      return response.data;
    }, 'Jupiter Quote');
  }

  /**
   * Execute Swap on Solana (Buy or Sell)
   */
  async executeSwap(tokenMint, amount = 0.02, isBuy = true, rawAmount = null, customSlippageBps = null) {
    const requiredSol = isBuy ? amount : config.GAS_BUFFER_SOL;
    
    await this.checkTradingMode(requiredSol);

    const inputMint = isBuy ? this.wsoldMint : tokenMint;
    const outputMint = isBuy ? tokenMint : this.wsoldMint;
    
    // Dynamically determine output token decimals
    const outputDecimals = await this.getTokenDecimals(outputMint);
    
    if (this.isPaperTrading) {
      console.log(`\n--- 📈 [模擬交易 (Paper Trading)] 模擬${isBuy ? '買入' : '賣出'}中... ---`);
      console.log(`[模擬] 目標代幣 Mint: ${tokenMint} | 滑點: ${customSlippageBps !== null ? customSlippageBps : (config.SLIPPAGE_BPS || 100)} bps`);
      
      let amountLamports;
      if (isBuy) {
        amountLamports = Math.floor(amount * 1e9);
        console.log(`[模擬] 買入金額: ${amount} SOL`);
      } else {
        amountLamports = rawAmount ? Math.floor(Number(rawAmount)) : Math.floor(amount * 1e6);
        console.log(`[模擬] 賣出代幣數量 (最小單位): ${amountLamports}`);
      }
      
      try {
        const quote = await this.getQuote(inputMint, outputMint, amountLamports, customSlippageBps);
        const outputAmount = quote.outAmount / Math.pow(10, outputDecimals);
        
        console.log(`[模擬成功] 模擬${isBuy ? '買入' : '賣出'}成功！`);
        console.log(`[模擬] 獲得約: ${outputAmount.toFixed(6)} ${isBuy ? 'Tokens' : 'SOL'}`);
        
        return {
          success: true,
          txid: `paper_tx_${crypto.randomBytes(8).toString('hex')}`,
          mode: 'PAPER',
          amountOut: outputAmount,
          rawAmountOut: quote.outAmount,
          quoteResponse: quote
        };
      } catch (e) {
        console.log(`[模擬成功 (保底)] API 暫時不可用，採用保底模擬數據。`);
        const mockAmountOut = isBuy ? amount * 1000 : 0.02;
        const mockRawAmount = isBuy
          ? Math.floor(amount * 1000 * Math.pow(10, 6))
          : Math.floor(0.02 * 1e9);
        return {
          success: true,
          txid: `paper_mock_tx_${crypto.randomBytes(8).toString('hex')}`,
          mode: 'PAPER',
          amountOut: mockAmountOut,
          rawAmountOut: mockRawAmount,
          quoteResponse: null
        };
      }
    }

    // Real Live Trading Mode
    console.log(`\n--- 🚀 [實戰交易 (Live Trading)] 正在向 Solana 鏈上提交${isBuy ? '買入' : '賣出'}交易... ---`);
    console.log(`[實戰] 目標代幣 Mint: ${tokenMint} | 滑點: ${customSlippageBps !== null ? customSlippageBps : (config.SLIPPAGE_BPS || 100)} bps`);
    const signer = this.wallet.getSigner();
    
    let amountLamports;
    if (isBuy) {
      amountLamports = Math.floor(amount * 1e9);
      console.log(`[實戰] 買入金額: ${amount} SOL`);
    } else {
      amountLamports = rawAmount ? Math.floor(Number(rawAmount)) : Math.floor(amount * 1e6);
      console.log(`[實戰] 賣出代幣數量 (最小單位): ${amountLamports}`);
    }

    const maxLiveRetries = isBuy ? 1 : 3; // 賣出（平倉保命）給予 3 次極速重試
    for (let liveAttempt = 1; liveAttempt <= maxLiveRetries; liveAttempt++) {
      try {
        if (liveAttempt > 1) {
          console.warn(`🔄 [JupiterTrader] 實戰賣出交易第 ${liveAttempt} 次重試...`);
        }

        console.log('[JupiterTrader] Requesting quote from Jupiter V6...');
        const quoteResponse = await this.getQuote(inputMint, outputMint, amountLamports, customSlippageBps);

        console.log('[JupiterTrader] Requesting serialized transaction with Priority Fee...');
        const swapResponse = await this.withRetry(async () => {
          return axios.post('https://quote-api.jup.ag/v6/swap', {
            quoteResponse,
            userPublicKey: signer.publicKey.toBase58(),
            wrapAndUnwrapSol: true,
            prioritizationFeeLamports: 100000 // 0.0001 SOL Micro priority fee for instant verification
          }, { timeout: 15000 });
        }, 'Jupiter Swap TX');

        const { swapTransaction } = swapResponse.data;
        console.log('[JupiterTrader] Serialized swap transaction retrieved successfully.');

        const transactionBuf = Buffer.from(swapTransaction, 'base64');
        const transaction = VersionedTransaction.deserialize(transactionBuf);
        
        console.log('[JupiterTrader] Signing transaction with Secure Wallet private key...');
        transaction.sign([signer]);

        console.log('[JupiterTrader] Sending raw transaction to Solana network (skipPreflight: true)...');
        const txid = await this.connection.sendRawTransaction(transaction.serialize(), {
          skipPreflight: true, // 🚀 設為 true 以加快發送並防止本地模擬執行誤判
          preflightCommitment: 'confirmed'
        });

        console.log(`[JupiterTrader] Transaction submitted! TXID: ${txid}`);
        console.log('[JupiterTrader] Waiting for blockchain confirmation (max 30 seconds)...');
        
        const latestBlockHash = await this.connection.getLatestBlockhash();
        await this.connection.confirmTransaction({
          blockhash: latestBlockHash.blockhash,
          lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
          signature: txid
        }, 'confirmed');

        console.log('🎉 [JupiterTrader] 鏈上 Swap 交易完全成功！');
        
        const outputAmount = quoteResponse.outAmount / Math.pow(10, outputDecimals);
        
        return {
          success: true,
          txid,
          mode: 'LIVE',
          amountOut: outputAmount,
          rawAmountOut: quoteResponse.outAmount,
          quoteResponse
        };

      } catch (error) {
        console.error(`❌ [JupiterTrader Error] Real Swap Attempt ${liveAttempt} failed:`, error.message);
        if (liveAttempt === maxLiveRetries) {
          throw error;
        }
        // 等待 1.5 秒再進行下一次重試，確保重新獲取最新的 blockhash
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
  }
}

module.exports = JupiterTrader;
