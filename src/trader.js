const axios = require('axios');
const crypto = require('crypto');
const { Connection, VersionedTransaction } = require('@solana/web3.js');
const SecureWallet = require('./wallet');

class JupiterTrader {
  /**
   * @param {SecureWallet} secureWallet - The secure wallet instance
   * @param {string} rpcUrl - Solana RPC Endpoint
   */
  constructor(secureWallet, rpcUrl = 'https://api.mainnet-beta.solana.com') {
    this.wallet = secureWallet;
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.wsoldMint = 'So11111111111111111111111111111111111111112'; // Native SOL Mint on Jupiter
    
    // Default paper-trading mode if funds are insufficient
    this.isPaperTrading = true;
    
    console.log(`[JupiterTrader] Initialized with RPC: ${rpcUrl}`);
  }

  /**
   * Check wallet balance and decide between Live or Paper trading
   * @param {number} requiredSol - SOL required for current swap (excluding gas)
   */
  async checkTradingMode(requiredSol = 0.05) {
    try {
      const pubKey = this.wallet.getSigner().publicKey;
      const lamports = await this.connection.getBalance(pubKey);
      const solBalance = lamports / 1e9;
      
      console.log(`[JupiterTrader] Current hot-wallet balance: ${solBalance.toFixed(4)} SOL`);
      
      if (solBalance < (requiredSol + 0.005)) { // 0.005 is reserved buffer for SOL gas
        console.log(`⚠️ [JupiterTrader] 餘額不足以進行真實交易 (需要 ${requiredSol + 0.005} SOL)。`);
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
   * Get Swap Quote from Jupiter
   */
  async getQuote(inputMint, outputMint, amountInLamports) {
    try {
      const url = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountInLamports}&slippageBps=100`;
      const response = await axios.get(url);
      return response.data;
    } catch (err) {
      console.error('[JupiterTrader Error] Failed to fetch quote from Jupiter:', err.response?.data || err.message);
      throw err;
    }
  }

  /**
   * Execute Swap on Solana (Buy or Sell)
   * @param {string} tokenMint - The mint address of the target token
   * @param {number} amount - Amount of input token (SOL if buy, Token if sell without rawAmount)
   * @param {boolean} isBuy - true to Buy token with SOL, false to Sell token for SOL
   * @param {number|string|null} rawAmount - The exact raw amount in lamports/minimal units for sell
   */
  async executeSwap(tokenMint, amount = 0.02, isBuy = true, rawAmount = null) {
    const requiredSol = isBuy ? amount : 0.005; // 0.005 buffer for gas when selling
    
    // 1. Establish balance & determine mode
    await this.checkTradingMode(requiredSol);

    const inputMint = isBuy ? this.wsoldMint : tokenMint;
    const outputMint = isBuy ? tokenMint : this.wsoldMint;
    
    if (this.isPaperTrading) {
      console.log(`\n--- 📈 [模擬交易 (Paper Trading)] 模擬${isBuy ? '買入' : '賣出'}中... ---`);
      console.log(`[模擬] 目標代幣 Mint: ${tokenMint}`);
      
      let amountLamports;
      if (isBuy) {
        amountLamports = Math.floor(amount * 1e9);
        console.log(`[模擬] 買入金額: ${amount} SOL`);
      } else {
        amountLamports = rawAmount ? Math.floor(Number(rawAmount)) : Math.floor(amount * 1e6);
        console.log(`[模擬] 賣出代幣數量 (最小單位): ${amountLamports}`);
      }
      
      // Fetch live price from Jupiter Quote API to make Paper Trading extremely realistic
      try {
        const quote = await this.getQuote(inputMint, outputMint, amountLamports);
        const outputAmount = quote.outAmount / (isBuy ? 1e6 : 1e9); // Buy assumes average 6 decimals token, Sell outputs SOL (9 decimals)
        
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
        // Fallback mock output if Quote API has errors
        console.log(`[模擬成功 (保底)] API 暫時不可用，採用保底模擬數據。`);
        const mockAmountOut = isBuy ? amount * 1000 : amount / 1000;
        const mockRawAmount = isBuy ? Math.floor(amount * 1000 * 1e6) : Math.floor(amount / 1000 * 1e9);
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

    // 2. Real Live Trading Mode
    console.log(`\n--- 🚀 [實戰交易 (Live Trading)] 正在向 Solana 鏈上提交${isBuy ? '買入' : '賣出'}交易... ---`);
    const signer = this.wallet.getSigner();
    
    let amountLamports;
    if (isBuy) {
      amountLamports = Math.floor(amount * 1e9);
      console.log(`[實戰] 買入金額: ${amount} SOL`);
    } else {
      amountLamports = rawAmount ? Math.floor(Number(rawAmount)) : Math.floor(amount * 1e6);
      console.log(`[實戰] 賣出代幣數量 (最小單位): ${amountLamports}`);
    }

    try {
      // Step A: Fetch swap quote
      console.log('[JupiterTrader] Requesting quote from Jupiter V6...');
      const quoteResponse = await this.getQuote(inputMint, outputMint, amountLamports);

      // Step B: Request Swap Transaction serialized object
      console.log('[JupiterTrader] Requesting serialized transaction...');
      const swapResponse = await axios.post('https://quote-api.jup.ag/v6/swap', {
        quoteResponse,
        userPublicKey: signer.publicKey.toBase58(),
        wrapAndUnwrapSol: true
      });

      const { swapTransaction } = swapResponse.data;
      console.log('[JupiterTrader] Serialized swap transaction retrieved successfully.');

      // Step C: Deserialize and Sign Transaction
      const transactionBuf = Buffer.from(swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(transactionBuf);
      
      console.log('[JupiterTrader] Signing transaction with Secure Wallet private key...');
      transaction.sign([signer]);

      // Step D: Send Raw Transaction
      console.log('[JupiterTrader] Sending raw transaction to Solana network...');
      const txid = await this.connection.sendRawTransaction(transaction.serialize(), {
        skipPreflight: false,
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
      
      return {
        success: true,
        txid,
        mode: 'LIVE',
        amountOut: quoteResponse.outAmount / (isBuy ? 1e6 : 1e9),
        rawAmountOut: quoteResponse.outAmount,
        quoteResponse
      };

    } catch (error) {
      console.error('❌ [JupiterTrader Error] Real Swap failed:', error.message);
      throw error;
    }
  }
}

module.exports = JupiterTrader;
