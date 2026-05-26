/**
 * Option 2: Risk Avoidance Defense Social Campaign - Unit Test
 * 
 * Run with: node src/test_risk_avoidance.js
 */

const fs = require('fs');
const path = require('path');
const brain = require('../src/brain');

const memoryPath = path.join(__dirname, '../config/memory.json');
const backupPath = path.join(__dirname, '../config/memory.json.bak');

// Mock data
const mockTokens = [
  {
    name: "RugPullCoin",
    symbol: "RPC",
    auditResult: {
      compositeScore: 42,
      riskLevel: 'HIGH',
      flags: ['Rugcheck DANGER score: 850', 'Low liquidity']
    }
  },
  {
    name: "NoTelegramMeme",
    symbol: "NTM",
    auditResult: {
      compositeScore: 30,
      riskLevel: 'EXTREME',
      flags: ['Telegram link unavailable (potential high risk)']
    }
  }
];

const mockPortfolio = {
  balanceUSD: 98500.45
};

async function runTest() {
  console.log('🧪 Starting Unit Test: Option 2 Risk Avoidance Defense Social Campaign...\n');

  // 1. Backup memory.json
  let memoryBackup = null;
  if (fs.existsSync(memoryPath)) {
    console.log('[Test Setup] Backing up memory.json to memory.json.bak');
    memoryBackup = fs.readFileSync(memoryPath, 'utf8');
    fs.writeFileSync(backupPath, memoryBackup, 'utf8');
  }

  try {
    // 2. Initialize test memory state
    brain.memory.short_term.consecutive_no_trade_scans = 0;
    brain.memory.short_term.last_risk_avoidance_tweet_date = "";
    brain.saveState();

    // 3. Test thresholds below limit
    console.log('👉 [Test 1] Testing count = 4 (Limit is 5)...');
    brain.memory.short_term.consecutive_no_trade_scans = 4;
    brain.saveState();
    let shouldPost = brain.shouldPostRiskAvoidanceDiary(5);
    console.log(` -> shouldPostRiskAvoidanceDiary(5): ${shouldPost} (Expected: false)`);
    if (shouldPost !== false) throw new Error('Test 1 failed: trigger occurred prematurely.');

    // 4. Test thresholds at limit
    console.log('\n👉 [Test 2] Testing count = 5 (Limit is 5)...');
    brain.memory.short_term.consecutive_no_trade_scans = 5;
    brain.saveState();
    shouldPost = brain.shouldPostRiskAvoidanceDiary(5);
    console.log(` -> shouldPostRiskAvoidanceDiary(5): ${shouldPost} (Expected: true)`);
    if (shouldPost !== true) throw new Error('Test 2 failed: trigger did not fire at limit.');

    // 5. Test duplicate protection
    console.log('\n👉 [Test 3] Testing duplicate posting protection on same day...');
    brain.memory.short_term.last_risk_avoidance_tweet_date = new Date().toLocaleDateString('zh-TW');
    brain.saveState();
    shouldPost = brain.shouldPostRiskAvoidanceDiary(5);
    console.log(` -> shouldPostRiskAvoidanceDiary(5) with same-day date: ${shouldPost} (Expected: false)`);
    if (shouldPost !== false) throw new Error('Test 3 failed: duplicate protection bypassed.');

    // Reset date for generation test
    brain.memory.short_term.last_risk_avoidance_tweet_date = "";
    brain.saveState();

    // 6. Test Humorous Diary text generation
    console.log('\n👉 [Test 4] Testing Humorous Diary Roast text generation...');
    const text = brain.generateRiskAvoidanceDiary(mockTokens, mockPortfolio);
    
    console.log('\n================== GENERATED DIARY ==================');
    console.log(text);
    console.log('=====================================================\n');

    // Validation checks on content
    console.log('🔍 Running textual heuristics validation...');
    const checks = {
      worldview: text.includes('奶爸') && text.includes('寶寶') && text.includes('冷氣'),
      roast: text.includes('$RPC') && text.includes('Rugcheck') && text.includes('$NTM'),
      tokenomics: text.includes('$PROFIT') && text.includes('通縮飛輪') && text.includes('Survive First')
    };

    console.log(` - Worldview fit: ${checks.worldview ? 'PASS �? : 'FAIL �?}`);
    console.log(` - Real-name Meme Roast: ${checks.roast ? 'PASS �? : 'FAIL �?}`);
    console.log(` - Tokenomics & Flyingwheel: ${checks.tokenomics ? 'PASS �? : 'FAIL �?}`);

    if (!checks.worldview || !checks.roast || !checks.tokenomics) {
      throw new Error('Test 4 failed: Generated text did not meet structural/worldview standards.');
    }

    console.log('\n🎉 All tests passed successfully!');

  } catch (error) {
    console.error('\n�?Test execution failed:', error.message);
  } finally {
    // 7. Restore memory.json from backup
    if (memoryBackup) {
      console.log('\n[Test Cleanup] Restoring memory.json from backup...');
      fs.writeFileSync(memoryPath, memoryBackup, 'utf8');
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
      }
    }
    console.log('[Test Cleanup] Completed.');
  }
}

runTest();
