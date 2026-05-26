const axios = require('axios');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config();

function generateSignature(queryString, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(queryString)
    .digest('hex');
}

async function testSpot() {
  const apiKey = process.env.BINANCE_SPOT_TESTNET_API_KEY;
  const secretKey = process.env.BINANCE_SPOT_TESTNET_API_SECRET;
  console.log('Testing Spot Testnet API...');
  console.log(`API Key: ${apiKey ? apiKey.substring(0, 10) + '...' : 'MISSING'}`);
  console.log(`Secret Key: ${secretKey ? secretKey.substring(0, 10) + '...' : 'MISSING'}`);
  
  if (!apiKey || !secretKey) {
    console.log('Spot keys missing!');
    return;
  }
  
  try {
    const timestamp = Date.now();
    const queryString = `recvWindow=5000&timestamp=${timestamp}`;
    const signature = generateSignature(queryString, secretKey);
    const url = `https://testnet.binance.vision/api/v3/account?${queryString}&signature=${signature}`;
    
    const response = await axios.get(url, {
      headers: { 'X-MBX-APIKEY': apiKey },
      timeout: 5000
    });
    console.log('✅ Spot Testnet API Succeeded!');
    console.log('Spot balance assets:', response.data.balances.filter(b => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0));
  } catch (error) {
    console.log('❌ Spot Testnet API Failed!');
    if (error.response) {
      console.log('Response Status:', error.response.status);
      console.log('Response Data:', error.response.data);
    } else {
      console.log('Error Message:', error.message);
    }
  }
}

async function testFutures() {
  const apiKey = process.env.BINANCE_TESTNET_API_KEY;
  const secretKey = process.env.BINANCE_TESTNET_SECRET_KEY;
  console.log('\nTesting Futures Testnet API...');
  console.log(`API Key: ${apiKey ? apiKey.substring(0, 10) + '...' : 'MISSING'}`);
  console.log(`Secret Key: ${secretKey ? secretKey.substring(0, 10) + '...' : 'MISSING'}`);
  
  if (!apiKey || !secretKey) {
    console.log('Futures keys missing!');
    return;
  }
  
  try {
    const timestamp = Date.now();
    const queryString = `recvWindow=5000&timestamp=${timestamp}`;
    const signature = generateSignature(queryString, secretKey);
    const url = `https://demo-fapi.binance.com/fapi/v2/account?${queryString}&signature=${signature}`;
    
    const response = await axios.get(url, {
      headers: { 'X-MBX-APIKEY': apiKey },
      timeout: 5000
    });
    console.log('✅ Futures Testnet API Succeeded!');
    console.log('Futures balance assets:', response.data.assets.filter(a => parseFloat(a.walletBalance) > 0).map(a => ({ asset: a.asset, balance: a.walletBalance })));
  } catch (error) {
    console.log('❌ Futures Testnet API Failed!');
    if (error.response) {
      console.log('Response Status:', error.response.status);
      console.log('Response Data:', error.response.data);
    } else {
      console.log('Error Message:', error.message);
    }
  }
}

(async () => {
  await testSpot();
  await testFutures();
})();
