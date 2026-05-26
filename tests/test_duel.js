require('dotenv').config();
const DegenTerminalAgent = require('../src/index');
const fs = require('fs');
const path = require('path');

console.log('\n======================================================');
console.log('   ProfitEngine - DegenTerminal 雙雄平行對決單元測試   ');
console.log('   v2.0 �?Green (風格狙擊�? vs ZMAC (高頻勝率工廠)       ');
console.log('======================================================\n');

async function runDuelTest() {
  try {
    // 1. Instantiate both agents
    console.log('[Test Setup] 實例化雙�?Agent...');
    const green = new DegenTerminalAgent('conservative');
    const zmac = new DegenTerminalAgent('aggressive');

    console.log(`🟢 [Green] Mode: ${green.mode}`);
    console.log(`🟣 [ZMAC] Mode: ${zmac.mode}`);

    // 2. Validate Path Isolation
    console.log('\n[Test Validation] 驗證數據檔案物理隔離狀�?..');
    const greenPortfolio = green.getPortfolioPath();
    const zmacPortfolio = zmac.getPortfolioPath();
    const greenPositions = green.getPositionsPath();
    const zmacPositions = zmac.getPositionsPath();
    const greenHistory = green.getTradeHistoryPath();
    const zmacHistory = zmac.getTradeHistoryPath();

    console.log(`🟢 Green portfolio file: ${path.basename(greenPortfolio)}`);
    console.log(`🟣 ZMAC portfolio file: ${path.basename(zmacPortfolio)}`);
    
    if (greenPortfolio === zmacPortfolio) {
      throw new Error('�?FAILURE: Portfolios are NOT isolated!');
    }
    if (greenPositions === zmacPositions) {
      throw new Error('�?FAILURE: Positions are NOT isolated!');
    }
    if (greenHistory === zmacHistory) {
      throw new Error('�?FAILURE: Trade history is NOT isolated!');
    }
    console.log('�?PASS: 所有數據庫檔案皆已完成物理隔離�?);

    // 3. Verify Virtual Portfolios Initialization
    console.log('\n[Test Validation] 檢查虛擬帳戶初始�?..');
    console.log(`🟢 Green 淨�? $${green.virtualPortfolio.netValueUSD || green.virtualPortfolio.balanceUSD} USD`);
    console.log(`🟣 ZMAC 淨�? $${zmac.virtualPortfolio.netValueUSD || zmac.virtualPortfolio.balanceUSD} USD`);
    
    // 4. Force a Mock Paper Trade on ZMAC to verify write functionality
    console.log('\n[Test Action] 模擬 ZMAC 建立一個極速套利倉位...');
    const zmacPosFile = zmacPositions;
    let mockZmacPositions = [];
    if (fs.existsSync(zmacPosFile)) {
      try {
        mockZmacPositions = JSON.parse(fs.readFileSync(zmacPosFile, 'utf8'));
      } catch (e) {
        mockZmacPositions = [];
      }
    }
    
    // Push a mock position if empty, to ensure dashboard displays something
    if (mockZmacPositions.length === 0) {
      mockZmacPositions.push({
        symbol: 'TESTZMAC',
        name: 'Mock Zmac Token',
        address: 'TestZmacMintAddress111111111111111111111111',
        buyPriceSol: 1.5,
        buyPriceUSD: 200.0,
        rawAmountOut: 120000000000,
        buyTime: Date.now() - 5 * 60 * 1000, // 5 mins ago
        lastPnlPercent: '1.50',
        maxHoldMinutes: 12
      });
      fs.writeFileSync(zmacPosFile, JSON.stringify(mockZmacPositions, null, 2), 'utf8');
      console.log('🟣 ZMAC test position injected successfully!');
    }

    // 5. Force a Mock Paper Trade on Green to verify write functionality
    console.log('\n[Test Action] 模擬 Green 建立一個精準狙擊倉位...');
    const greenPosFile = greenPositions;
    let mockGreenPositions = [];
    if (fs.existsSync(greenPosFile)) {
      try {
        mockGreenPositions = JSON.parse(fs.readFileSync(greenPosFile, 'utf8'));
      } catch (e) {
        mockGreenPositions = [];
      }
    }

    if (mockGreenPositions.length === 0) {
      mockGreenPositions.push({
        symbol: 'TESTGRN',
        name: 'Mock Green Sniper',
        address: 'TestGreenMintAddress11111111111111111111111',
        buyPriceSol: 3.2,
        buyPriceUSD: 500.0,
        rawAmountOut: 35000000000,
        buyTime: Date.now() - 20 * 60 * 1000, // 20 mins ago
        lastPnlPercent: '5.20',
        maxHoldMinutes: 45
      });
      fs.writeFileSync(greenPosFile, JSON.stringify(mockGreenPositions, null, 2), 'utf8');
      console.log('🟢 Green test position injected successfully!');
    }

    // 6. Test updateWebDashboard updates joint payload
    console.log('\n[Test Action] 執行 updateWebDashboard 並輸�?Unified JSON...');
    green.updateWebDashboard(mockGreenPositions);
    zmac.updateWebDashboard(mockZmacPositions);
    
    // Read combined payload
    const dataPath = path.join(__dirname, '../public/data.json');
    if (!fs.existsSync(dataPath)) {
      throw new Error('�?FAILURE: public/data.json was not created!');
    }
    
    const combinedData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    console.log('Combined JSON root keys:', Object.keys(combinedData));
    
    if (!combinedData.conservative || !combinedData.aggressive) {
      throw new Error('�?FAILURE: Combined payload does not contain BOTH agent sections!');
    }
    
    console.log('🟢 Conservative Sniper Positions in JSON:', combinedData.conservative.positions.length);
    console.log('🟣 Aggressive Scalper Positions in JSON:', combinedData.aggressive.positions.length);
    
    console.log('\n�?PASS: 雙大腦平行運行與數據庫寫入測�?100% 成功�?);
    process.exit(0);

  } catch (error) {
    console.error('\n�?CRITICAL DUEL TEST ERROR:', error.message);
    process.exit(1);
  }
}

runDuelTest();
