const axios = require('axios');

const COINGECKO_TRENDING_URL = 'https://api.coingecko.com/api/v3/search/trending';
const FNG_URL = 'https://api.alternative.me/fng/';

/**
 * Fetches the top trending coins and categories from CoinGecko.
 * Fully free, no API Key required. Highly rate-limited, so wrapped in bulletproof fallback.
 */
async function fetchCoinGeckoTrending() {
  console.log('[MarketTrends] Fetching CoinGecko trending narratives...');
  try {
    const response = await axios.get(COINGECKO_TRENDING_URL, {
      timeout: 5000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (response.data) {
      const coins = response.data.coins || [];
      const categories = response.data.categories || [];

      // Extract symbols of top 5 trending coins (uppercase)
      const trendingCoins = coins.slice(0, 5).map(c => (c.item?.symbol || '').toUpperCase()).filter(Boolean);
      
      // Extract top 3 trending categories
      const trendingCategories = categories.slice(0, 3).map(cat => cat.name || '').filter(Boolean);

      console.log(`[MarketTrends] Successfully loaded CoinGecko trending. Coins: [${trendingCoins.join(', ')}], Categories: [${trendingCategories.join(', ')}]`);
      
      return {
        trending_coins: trendingCoins,
        trending_categories: trendingCategories
      };
    }
  } catch (error) {
    const status = error.response ? error.response.status : 'NETWORK_ERROR';
    console.warn(`[MarketTrends] CoinGecko API request failed (Status: ${status}, Message: ${error.message}).`);
  }
  return null;
}

/**
 * Fetches the Crypto Fear & Greed Index (FNG) from alternative.me API.
 * Fully free, no API Key required. Highly stable, daily updates.
 */
async function fetchCryptoFearAndGreed() {
  console.log('[MarketTrends] Fetching Crypto Fear & Greed Index...');
  try {
    const response = await axios.get(FNG_URL, {
      timeout: 5000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (response.data && response.data.data && response.data.data.length > 0) {
      const fngData = response.data.data[0];
      const value = parseInt(fngData.value, 10) || 50;
      const classification = fngData.value_classification || 'Neutral';
      
      console.log(`[MarketTrends] Successfully loaded FNG. Value: ${value} (${classification})`);
      
      return {
        value,
        classification
      };
    }
  } catch (error) {
    const status = error.response ? error.response.status : 'NETWORK_ERROR';
    console.warn(`[MarketTrends] Fear & Greed API request failed (Status: ${status}, Message: ${error.message}).`);
  }
  return null;
}

/**
 * Fetches top trending Solana meme pairs from DexScreener.
 * Fully free, no API Key required. Wraps requests with strong fallbacks.
 */
async function fetchDexScreenerTrending() {
  console.log('[MarketTrends] Fetching DexScreener Solana meme trending...');
  try {
    const response = await axios.get('https://api.dexscreener.com/latest/dex/search?q=raydium', {
      timeout: 5000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (response.data && response.data.pairs) {
      const pairs = response.data.pairs;
      // Filter out baseToken = SOL/WSOL/USDC/USDT or other main assets, chainId = solana
      const filtered = pairs.filter(p => 
        p.chainId === 'solana' && 
        p.baseToken?.symbol?.toUpperCase() !== 'SOL' &&
        p.baseToken?.symbol?.toUpperCase() !== 'WSOL' &&
        p.baseToken?.symbol?.toUpperCase() !== 'USDC' &&
        p.baseToken?.symbol?.toUpperCase() !== 'USDT'
      );

      // Sort by 24h volume
      filtered.sort((a, b) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0));

      // Get top 4 trending meme tokens
      const result = filtered.slice(0, 4).map(p => ({
        symbol: (p.baseToken?.symbol || '').toUpperCase(),
        name: p.baseToken?.name || '',
        address: p.baseToken?.address || '',
        priceUsd: parseFloat(p.priceUsd) || 0,
        priceChange24h: parseFloat(p.priceChange?.h24) || 0,
        volume24h: parseFloat(p.volume?.h24) || 0
      }));

      console.log(`[MarketTrends] Successfully loaded DexScreener trending. Coins: [${result.map(c => c.symbol).join(', ')}]`);
      return result;
    }
  } catch (error) {
    const status = error.response ? error.response.status : 'NETWORK_ERROR';
    console.warn(`[MarketTrends] DexScreener API request failed (Status: ${status}, Message: ${error.message}).`);
  }
  return null;
}

/**
 * Unified entry point to get market trends.
 * Supports caching and elegant fallbacks to prevent 24/7 scheduler crash.
 */
async function getMarketTrends(existingMemory = {}) {
  // Load existing cached data from memory to use as the absolute fallback
  const cachedTrends = existingMemory.analytics_feedback?.market_trends || {};
  
  // 1. Fetch CoinGecko Trending
  let geckoData = await module.exports.fetchCoinGeckoTrending();
  if (!geckoData) {
    console.log('[MarketTrends] Using cached CoinGecko trending as fallback.');
    geckoData = {
      trending_coins: cachedTrends.trending_coins || ['SOL', 'TAO', 'WIF', 'POPCAT', 'RNDR'],
      trending_categories: cachedTrends.trending_categories || ['Meme', 'AI Agent', 'DePIN']
    };
  }

  // 2. Fetch Crypto Fear & Greed Index
  let fngData = await module.exports.fetchCryptoFearAndGreed();
  if (!fngData) {
    console.log('[MarketTrends] Using cached Fear & Greed Index as fallback.');
    fngData = cachedTrends.fng || {
      value: 50,
      classification: 'Neutral'
    };
  }

  // 3. Fetch DexScreener Trending
  let dexData = await module.exports.fetchDexScreenerTrending();
  if (!dexData) {
    console.log('[MarketTrends] Using cached DexScreener trending as fallback.');
    dexData = cachedTrends.dexscreener || [
      { symbol: 'WIF', name: 'dogwifhat', priceUsd: 1.52, priceChange24h: 5.4, volume24h: 1250000 },
      { symbol: 'POPCAT', name: 'Popcat', priceUsd: 0.82, priceChange24h: -2.3, volume24h: 980000 },
      { symbol: 'BONK', name: 'Bonk', priceUsd: 0.0000185, priceChange24h: 12.1, volume24h: 640000 }
    ];
  }

  // Combine and return
  const finalResult = {
    trending_coins: geckoData.trending_coins,
    trending_categories: geckoData.trending_categories,
    fng: {
      value: fngData.value,
      classification: fngData.classification,
      last_updated: Date.now()
    },
    dexscreener: dexData,
    last_updated: Date.now()
  };

  console.log(`[MarketTrends] Unified market trends generated. FNG: ${finalResult.fng.value} (${finalResult.fng.classification}), DexScreener Items: ${finalResult.dexscreener.length}`);
  return finalResult;
}

module.exports = {
  fetchCoinGeckoTrending,
  fetchCryptoFearAndGreed,
  fetchDexScreenerTrending,
  getMarketTrends
};
