const axios = require('axios');
const { Connection, PublicKey } = require('@solana/web3.js');
const config = require('./config');
const { fetchDexScreenerTrending } = require('./market_trends');

/**
 * ProfitEngine On-chain Scanner Plugin v2.0
 * Uses DEXScreener API + Rugcheck API for comprehensive risk assessment.
 * Composite risk scoring: Social (20%) + Liquidity (30%) + Volume (25%) + Contract Safety (25%)
 */
class OnChainScanner {
  constructor() {
    this.apiBase = 'https://api.dexscreener.com';
    this.rugcheckBase = 'https://api.rugcheck.xyz/v1';
    this.supportedChains = ['solana'];
    this.cooldownMap = new Map(); // tokenAddress -> lastSellTimestamp
    this.connection = new Connection(config.RPC_URL || 'https://api.mainnet-beta.solana.com', 'confirmed');
  }

  /**
   * Set cooldown for a token (called after selling)
   */
  setCooldown(tokenAddress) {
    this.cooldownMap.set(tokenAddress, Date.now());
  }

  /**
   * Check if a token is in cooldown period
   */
  isInCooldown(tokenAddress) {
    const lastSell = this.cooldownMap.get(tokenAddress);
    if (!lastSell) return false;
    const cooldownMs = (config.COOLDOWN_HOURS || 4) * 60 * 60 * 1000;
    if (Date.now() - lastSell < cooldownMs) return true;
    this.cooldownMap.delete(tokenAddress);
    return false;
  }

  /**
   * Check token cooldown helper
   */
  isTokenInCooldown(tokenAddress) {
    return this.isInCooldown(tokenAddress);
  }

  /**
   * Fetch latest token profiles from DEXScreener
   */
  async getLatestProfiles() {
    try {
      const url = `${this.apiBase}/token-profiles/latest/v1`;
      console.log(`[Scanner] Fetching latest token profiles from ${url}...`);
      const response = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 15000
      });
      return response.data || [];
    } catch (error) {
      console.error('[Scanner Error] Failed to fetch latest profiles:', error.message);
      return this.getMockProfiles();
    }
  }

  /**
   * Fetch pair data from DEXScreener for liquidity, volume, price change
   * @param {string} chainId - e.g. 'solana'
   * @param {string} tokenAddress - the token's mint address
   */
  async getPairData(chainId, tokenAddress) {
    try {
      const url = `${this.apiBase}/tokens/v1/${chainId}/${tokenAddress}`;
      const response = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 10000
      });
      const pairs = response.data || [];
      if (pairs.length === 0) return null;
      // Return the pair with the highest liquidity
      return pairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
    } catch (error) {
      console.warn(`[Scanner] Failed to fetch pair data for ${tokenAddress}:`, error.message);
      return null;
    }
  }

  /**
   * Check contract safety via Rugcheck API
   * @param {string} tokenAddress - the Solana token mint address
   */
  async checkRugSafety(tokenAddress) {
    try {
      const url = `${this.rugcheckBase}/tokens/${tokenAddress}/report/summary`;
      const response = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 8000
      });
      const data = response.data;
      return {
        riskLevel: data.score !== undefined ? data.score : null,
        risks: data.risks || [],
        isSafe: data.score !== undefined ? data.score >= 500 : null // Rugcheck: higher = safer
      };
    } catch (error) {
      console.warn(`[Scanner] Rugcheck API unavailable for ${tokenAddress}:`, error.message);
      return { riskLevel: null, risks: [], isSafe: null };
    }
  }

  /**
   * Directly check token mint authority and freeze authority on Solana blockchain (Fallback Shield)
   * @param {string} tokenAddress - the Solana token mint address
   */
  async checkOnChainAuthorities(tokenAddress) {
    try {
      const pubkey = new PublicKey(tokenAddress);
      const accountInfo = await this.connection.getParsedAccountInfo(pubkey);
      
      if (accountInfo.value && accountInfo.value.data && accountInfo.value.data.parsed) {
        const info = accountInfo.value.data.parsed.info;
        // mintAuthority and freezeAuthority are either null (renounced) or a string public key
        const mintAuthority = info.mintAuthority;
        const freezeAuthority = info.freezeAuthority;
        
        console.log(`🛡️ [Scanner On-Chain Check] $${tokenAddress.slice(0, 8)}... | Mint Auth: ${mintAuthority} | Freeze Auth: ${freezeAuthority}`);
        return {
          mintAuthority,
          freezeAuthority,
          success: true
        };
      }
    } catch (err) {
      console.warn(`⚠️ [Scanner Shield Warning] On-chain RPC authority check failed for ${tokenAddress.slice(0, 8)}...:`, err.message);
    }
    return { mintAuthority: 'unknown', freezeAuthority: 'unknown', success: false };
  }

  /**
   * Comprehensive multi-factor risk audit
   * Composite scoring: Social (20%) + Liquidity (30%) + Volume (25%) + Contract (25%)
   */
  async auditTokenComprehensive(token, pairData, rugData, mode = 'conservative') {
    let socialScore = 0;
    let liquidityScore = 0;
    let volumeScore = 0;
    let contractScore = 0;
    const flags = [];

    // === 1. Social Score (max 100, weight 20%) ===
    if (token.description && token.description.length > 10) {
      socialScore += 30;
    } else {
      flags.push('Missing/short description');
    }

    if (token.links && token.links.length > 0) {
      const hasTwitter = token.links.some(l => l.type === 'twitter');
      const hasTelegram = token.links.some(l => l.type === 'telegram');
      const hasWebsite = token.links.some(l => l.type === 'website' || l.label === 'Website');
      if (hasTwitter) socialScore += 30;
      else flags.push('Missing Twitter');
      if (hasTelegram) socialScore += 20;
      else flags.push('Missing Telegram');
      if (hasWebsite) socialScore += 20;
      else flags.push('Missing Website');
    } else {
      flags.push('No social links at all');
    }

    // === 2. Liquidity Score (max 100, weight 30%) ===
    if (pairData) {
      const liqUSD = pairData.liquidity?.usd || 0;
      if (liqUSD >= 100000) liquidityScore = 100;
      else if (liqUSD >= 50000) liquidityScore = 80;
      else if (liqUSD >= 30000) liquidityScore = 60;
      else if (liqUSD >= 15000) liquidityScore = 30;
      else {
        liquidityScore = 0;
        flags.push(`Low liquidity ($${liqUSD.toFixed(0)})`);
      }
    } else {
      liquidityScore = 0;
      flags.push('No pair data available');
    }

    // === 3. Volume Score (max 100, weight 25%) ===
    if (pairData) {
      const vol24h = pairData.volume?.h24 || 0;
      const liqUSD = pairData.liquidity?.usd || 1;
      const volLiqRatio = vol24h / liqUSD;

      // Check price changes for pump & dump patterns
      const priceChange1h = pairData.priceChange?.h1 || 0;
      const priceChange24h = pairData.priceChange?.h24 || 0;

      if (volLiqRatio >= 0.5 && volLiqRatio <= 10) {
        volumeScore = 80; // Healthy trading activity
      } else if (volLiqRatio > 10) {
        volumeScore = 30; // Extremely high volume relative to liquidity = suspicious
        flags.push('Abnormally high volume/liquidity ratio');
      } else if (volLiqRatio < 0.1) {
        volumeScore = 20; // Dead token
        flags.push('Very low trading volume');
      } else {
        volumeScore = 50;
      }

      // Stricter price action filter to prevent top-buying
      if (priceChange24h > 300) {
        volumeScore = Math.max(0, volumeScore - 40);
        flags.push(`Extreme 24h pump (+${priceChange24h.toFixed(0)}%)`);
      } else if (priceChange24h < -50) {
        volumeScore = Math.max(0, volumeScore - 30);
        flags.push(`Severe 24h dump (${priceChange24h.toFixed(0)}%)`);
      }

      if (priceChange1h > 80) {
        volumeScore = Math.max(0, volumeScore - 35);
        flags.push(`Extreme 1h pump (+${priceChange1h.toFixed(0)}%)`);
      } else if (priceChange1h < -30) {
        volumeScore = Math.max(0, volumeScore - 20);
        flags.push(`Extreme 1h dump (${priceChange1h.toFixed(0)}%)`);
      }

      // Pair age check
      if (pairData.pairCreatedAt) {
        const ageHours = (Date.now() - pairData.pairCreatedAt) / (1000 * 60 * 60);
        if (ageHours < 3) {
          volumeScore = Math.max(0, volumeScore - 30);
          flags.push('Pair created < 3 hours ago');
        } else if (ageHours >= 3 && ageHours < 12) {
          volumeScore += 10;
        } else if (ageHours >= 12) {
          volumeScore += 20; // Well established
        }
      }
      
      volumeScore = Math.min(100, volumeScore);
    } else {
      volumeScore = 0;
    }

    let isCriticalRugTriggered = false;

    // === 4. Contract Safety Score (max 100, weight 25%) ===
    if (rugData && rugData.riskLevel !== null) {
      // Rugcheck score: 0 (perfectly safe) to 1000+ (highly dangerous)
      const rcScore = rugData.riskLevel;
      if (rcScore === 0) {
        contractScore = 100;
      } else if (rcScore < 200) {
        contractScore = 80;
      } else if (rcScore < 500) {
        contractScore = 50;
        flags.push(`Rugcheck warning score: ${rcScore}`);
      } else {
        contractScore = 0;
        flags.push(`Rugcheck DANGER score: ${rcScore}`);
      }

      if (rugData.risks && rugData.risks.length > 0) {
        for (const risk of rugData.risks) {
          const riskName = (risk.name || risk.description || '').toLowerCase();
          
          // 🛡️ Hard Reject for Mint / Freeze authority active or Honeypots
          if (riskName.includes('mint authority') || riskName.includes('freeze authority') || riskName.includes('honeypot')) {
            isCriticalRugTriggered = true;
            flags.push(`[CRITICAL RUG RISK] Active authority detected: ${risk.name}`);
          }

          if (risk.level === 'danger' || risk.level === 'critical') {
            contractScore = Math.max(0, contractScore - 35);
            flags.push(`Contract risk: ${risk.name || risk.description || 'Unknown'}`);
          }
        }
      }
      contractScore = Math.max(0, contractScore);
    } else {
      // If Rugcheck API fails or has no record, treat it as high risk (scoring it 15/100)
      contractScore = 15;
      flags.push('Rugcheck data unavailable (potential high risk)');
    }

    // === Composite Score ===
    let compositeScore = Math.round(
      socialScore * 0.20 +
      liquidityScore * 0.30 +
      volumeScore * 0.25 +
      contractScore * 0.25
    );

    if (isCriticalRugTriggered) {
      console.log(`🚨 [Rugpull Shield Block] Forcing composite score to 0 due to active critical authorities!`);
      compositeScore = 0;
    }

    // === Hard Liquidity & Volume Safety Shield ===
    let isHardRejected = false;
    let rejectReason = '';
    const minLiquidity = mode === 'conservative' ? 30000 : 15000;
    const minVolume = mode === 'conservative' ? 50000 : 20000;
    const minAgeMs = mode === 'conservative' ? 1.5 * 60 * 60 * 1000 : 30 * 60 * 1000;

    if (pairData) {
      const liqUSD = pairData.liquidity?.usd || 0;
      const vol24h = pairData.volume24h || pairData.volume?.h24 || 0;
      const ageMs = pairData.pairCreatedAt ? (Date.now() - pairData.pairCreatedAt) : 0;

      if (liqUSD < minLiquidity) {
        isHardRejected = true;
        rejectReason += `Liquidity $${liqUSD.toFixed(0)} < $${minLiquidity} | `;
      }
      if (vol24h < minVolume) {
        isHardRejected = true;
        rejectReason += `24h Vol $${vol24h.toFixed(0)} < $${minVolume} | `;
      }
      if (pairData.pairCreatedAt && ageMs < minAgeMs) {
        isHardRejected = true;
        rejectReason += `Age ${(ageMs / 60000).toFixed(0)}m < ${(minAgeMs / 60000).toFixed(0)}m | `;
      }
    } else {
      isHardRejected = true;
      rejectReason = 'Missing Pair Data';
    }

    if (isHardRejected) {
      console.log(`🛡️ [Liquidity Shield Hard Reject] Target $${token.tokenAddress.slice(0, 8)}... Rejected for: ${rejectReason.slice(0, -3)}. Score forced to 0.`);
      flags.push(`[HARD REJECT] ${rejectReason.slice(0, -3)}`);
      compositeScore = 0;
    }

    // Determine risk level
    let riskLevel;
    if (compositeScore >= 70) riskLevel = 'LOW';
    else if (compositeScore >= 50) riskLevel = 'MEDIUM';
    else if (compositeScore >= 30) riskLevel = 'HIGH';
    else riskLevel = 'EXTREME';

    return {
      compositeScore,
      riskLevel,
      flags,
      breakdown: {
        social: socialScore,
        liquidity: liquidityScore,
        volume: volumeScore,
        contract: contractScore
      }
    };
  }

  /**
   * Full scan and comprehensive audit pipeline
   * @param {string} mode - 'conservative' or 'aggressive'
   */
  async scanAndAudit(mode = 'conservative') {
    const rawTokens = await this.getLatestProfiles();
    const auditedTokens = [];

    // Filter to supported chains only
    const candidates = rawTokens.filter(t => this.supportedChains.includes(t.chainId));
    console.log(`[Scanner] Found ${candidates.length} candidate tokens from latest profiles.`);

    // 🚀 Dynamic Alpha Sourcing Shield: fetch and merge DexScreener Trending tokens
    try {
      console.log('[Scanner] Sourcing additional alpha targets from DexScreener Trending...');
      const trending = await fetchDexScreenerTrending();
      if (trending && trending.length > 0) {
        trending.forEach(item => {
          if (item.address && !candidates.some(c => c.tokenAddress === item.address)) {
            candidates.push({
              chainId: 'solana',
              tokenAddress: item.address,
              header: item.name,
              description: `DexScreener Trending Target: ${item.name} ($${item.symbol})`,
              links: [
                { type: 'website', url: `https://dexscreener.com/solana/${item.address}` }
              ]
            });
            console.log(`🔥 [Scanner Alpha Sourcing] Added Trending Target: $${item.symbol} (${item.address})`);
          }
        });
      }
    } catch (err) {
      console.warn('[Scanner Warning] Failed to merge DexScreener Trending targets:', err.message);
    }

    console.log(`[Scanner] Total processed candidate tokens (Profiles + Trending): ${candidates.length}`);

    // Process up to 15 tokens to avoid rate limiting
    const tokensToProcess = candidates.slice(0, 15);

    for (const token of tokensToProcess) {
      let name = token.header || 'Unknown Token';
      let symbol = token.tokenAddress.slice(0, 6).toUpperCase();

      if (name.startsWith('http') || name.includes('/') || name.includes('width=')) {
        name = `Token-${token.tokenAddress.slice(0, 6)}`;
        symbol = token.tokenAddress.slice(0, 6).toUpperCase();
      }

      // Skip tokens in cooldown
      if (this.isInCooldown(token.tokenAddress)) {
        console.log(`[Scanner] $${symbol} is in cooldown period. Skipping.`);
        continue;
      }

      // Fetch enrichment data (pair + rugcheck) in parallel
      let [pairData, rugData] = await Promise.all([
        this.getPairData(token.chainId, token.tokenAddress),
        token.chainId === 'solana' ? this.checkRugSafety(token.tokenAddress) : Promise.resolve(null)
      ]);

      // 🛡️ Web3 RPC Double-Check / Fallback Shield
      if (token.chainId === 'solana') {
        const onChain = await this.checkOnChainAuthorities(token.tokenAddress);
        if (onChain.success) {
          if (!rugData) {
            rugData = { riskLevel: 0, risks: [], isSafe: true };
          } else if (rugData.riskLevel === null) {
            rugData.riskLevel = 0;
            rugData.risks = [];
            rugData.isSafe = true;
          }

          if (onChain.mintAuthority !== null) {
            console.log(`⚠️ [Scanner Shield Danger] $${symbol} has active Mint Authority: ${onChain.mintAuthority}! Injecting risk flag.`);
            rugData.risks = rugData.risks || [];
            rugData.risks.push({ level: 'danger', name: 'Mint Authority Enabled (On-Chain Check)' });
            rugData.riskLevel = Math.max(rugData.riskLevel || 0, 800);
          }
          if (onChain.freezeAuthority !== null) {
            console.log(`⚠️ [Scanner Shield Danger] $${symbol} has active Freeze Authority: ${onChain.freezeAuthority}! Injecting risk flag.`);
            rugData.risks = rugData.risks || [];
            rugData.risks.push({ level: 'danger', name: 'Freeze Authority Enabled (On-Chain Check)' });
            rugData.riskLevel = Math.max(rugData.riskLevel || 0, 800);
          }
        }
      }

      const audit = await this.auditTokenComprehensive(token, pairData, rugData, mode);

      auditedTokens.push({
        name: name,
        symbol: symbol,
        address: token.tokenAddress,
        chain: token.chainId,
        url: token.url,
        description: token.description || 'No description provided.',
        socialsCount: token.links ? token.links.length : 0,
        hasTwitter: token.links ? token.links.some(l => l.type === 'twitter') : false,
        pairData: pairData ? {
          liquidity: pairData.liquidity?.usd || 0,
          volume24h: pairData.volume?.h24 || 0,
          priceChangeH1: pairData.priceChange?.h1 || 0,
          priceChangeH24: pairData.priceChange?.h24 || 0,
          pairCreatedAt: pairData.pairCreatedAt || null
        } : null,
        auditResult: audit
      });
    }

    // Sort by composite score (highest = safest first)
    return auditedTokens.sort((a, b) => {
      return b.auditResult.compositeScore - a.auditResult.compositeScore;
    });
  }

  /**
   * Simple static risk audit (legacy fallback)
   */
  auditTokenSecurity(token) {
    let riskScore = 0;
    const flags = [];

    if (!token.description) {
      riskScore += 20;
      flags.push('Missing token description');
    }
    if (!token.links || token.links.length === 0) {
      riskScore += 40;
      flags.push('No verified social media links');
    } else {
      const hasTwitter = token.links.some(l => l.type === 'twitter');
      const hasTelegram = token.links.some(l => l.type === 'telegram');
      if (!hasTwitter) { riskScore += 20; flags.push('Missing Twitter link'); }
      if (!hasTelegram) { riskScore += 10; flags.push('Missing Telegram link'); }
    }

    let riskLevel = 'LOW';
    if (riskScore >= 70) riskLevel = 'EXTREME';
    else if (riskScore >= 40) riskLevel = 'HIGH';
    else if (riskScore >= 20) riskLevel = 'MEDIUM';

    return { riskScore, riskLevel, flags };
  }

  /**
   * Mock profiles for local development fallback
   */
  getMockProfiles() {
    console.log('[Scanner] Using mock profile data for local testing...');
    return [
      {
        chainId: 'solana',
        tokenAddress: 'HN7cAB17r7k5591tT5vG5tV5xX5v5v5v5v5v5v5v5v5v',
        header: 'CarbonHater Bot',
        url: 'https://dexscreener.com/solana/HN7cAB17r7k5591tT5vG5tV5xX5v5v5v5v5v5v5v5v5v',
        description: 'A rebellious agent dedicated to mocking emotional carbon-based traders.',
        links: [
          { type: 'twitter', url: 'https://twitter.com/carbonhater' }
        ]
      },
      {
        chainId: 'solana',
        tokenAddress: 'RugMeOnce99999999999999999999999999999999',
        header: 'DeFiMoonRocket',
        url: 'https://dexscreener.com/solana/RugMeOnce99999999999999999999999999999999',
        description: '',
        links: []
      }
    ];
  }
}

module.exports = OnChainScanner;
