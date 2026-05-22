const axios = require('axios');

/**
 * ProfitEngine On-chain Scanner Plugin
 * Uses DEXScreener API to fetch and analyze trending/latest token profiles on Solana and Base.
 */
class OnChainScanner {
  constructor() {
    this.apiBase = 'https://api.dexscreener.com';
    this.supportedChains = ['solana', 'base'];
  }

  /**
   * Fetch latest token profiles from DEXScreener
   */
  async getLatestProfiles() {
    try {
      const url = `${this.apiBase}/token-profiles/latest/v1`;
      console.log(`[Scanner] Fetching latest token profiles from ${url}...`);
      const response = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      return response.data || [];
    } catch (error) {
      console.error('[Scanner Error] Failed to fetch latest profiles:', error.message);
      // Fallback to mock data for local simulation/dry-run if API fails or rate-limits
      return this.getMockProfiles();
    }
  }

  /**
   * Analyze and filter tokens based on risk and momentum
   */
  async scanAndAudit() {
    const rawTokens = await this.getLatestProfiles();
    const auditedTokens = [];

    for (const token of rawTokens) {
      // Filter only for Solana and Base
      if (!this.supportedChains.includes(token.chainId)) continue;

      let name = token.header || 'Unknown Token';
      let symbol = token.tokenAddress.slice(0, 6).toUpperCase();

      // If header is an image URL or empty, fallback to address-based tags
      if (name.startsWith('http') || name.includes('/') || name.includes('width=')) {
        name = `Token-${token.tokenAddress.slice(0, 6)}`;
        symbol = token.tokenAddress.slice(0, 6).toUpperCase();
      }

      const audit = this.auditTokenSecurity(token);
      auditedTokens.push({
        name: name,
        symbol: symbol,
        address: token.tokenAddress,
        chain: token.chainId,
        url: token.url,
        description: token.description || 'No description provided.',
        socialsCount: token.links ? token.links.length : 0,
        hasTwitter: token.links ? token.links.some(l => l.type === 'twitter') : false,
        auditResult: audit
      });
    }

    // Sort: verified socials and low risk first
    return auditedTokens.sort((a, b) => {
      if (a.auditResult.riskLevel !== b.auditResult.riskLevel) {
        const riskOrder = { 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'EXTREME': 4 };
        return riskOrder[a.auditResult.riskLevel] - riskOrder[b.auditResult.riskLevel];
      }
      return b.socialsCount - a.socialsCount;
    });
  }

  /**
   * Simple static contract risk auditor
   */
  auditTokenSecurity(token) {
    let riskScore = 0;
    const flags = [];

    // Check descriptions & socials
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
      if (!hasTwitter) {
        riskScore += 20;
        flags.push('Missing Twitter link');
      }
      if (!hasTelegram) {
        riskScore += 10;
        flags.push('Missing Telegram link');
      }
    }

    // Determine risk level
    let riskLevel = 'LOW';
    if (riskScore >= 70) riskLevel = 'EXTREME';
    else if (riskScore >= 40) riskLevel = 'HIGH';
    else if (riskScore >= 20) riskLevel = 'MEDIUM';

    return {
      riskScore,
      riskLevel,
      flags
    };
  }

  /**
   * Mock profiles for local development and dry-run stability
   */
  getMockProfiles() {
    console.log('[Scanner] Using mock profile data for local testing...');
    return [
      {
        chainId: 'base',
        tokenAddress: '0x1234567890abcdef1234567890abcdef12345678',
        header: 'SiliconVibe AI',
        url: 'https://dexscreener.com/base/0x1234567890abcdef1234567890abcdef12345678',
        description: 'First autonomous AI agent that translates code into lo-fi beats and trades in real-time.',
        links: [
          { type: 'twitter', url: 'https://twitter.com/siliconvibe' },
          { type: 'telegram', url: 'https://t.me/siliconvibe' }
        ]
      },
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
