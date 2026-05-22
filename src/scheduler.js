const DegenTerminalAgent = require('./index');

// Configuration
const INTERVAL_MINUTES = 30; // 預設每 30 分鐘掃描一次
const MS_IN_MINUTE = 60000;

async function startScheduler() {
  console.log('\n======================================================');
  console.log('   ProfitEngine - DegenTerminal 24/7 自動託管守護進程   ');
  console.log('======================================================\n');
  
  const agent = new DegenTerminalAgent();
  const publicKey = agent.wallet.getPublicKey();
  
  console.log(`🤖 Agent 角色名稱: ${agent.character.name}`);
  console.log(`💳 交易熱錢包地址: ${publicKey}`);
  console.log(`⏱️  自動掃描間隔: 每 ${INTERVAL_MINUTES} 分鐘`);
  console.log(`🚀 狀態: 運行中...`);
  console.log('💡 提示: 建議使用「pm2 start src/scheduler.js --name "degenterminal"」掛載背景不間斷運行。');
  console.log('======================================================\n');

  let iterationCount = 0;

  // Define the core iteration execution block
  const executeIteration = async () => {
    iterationCount++;
    console.log(`\n⏰ [${new Date().toLocaleTimeString()}] 啟動第 ${iterationCount} 次自主掃描輪詢...`);
    
    try {
      // 執行實時自動化（Live Mode）
      await agent.runAutonomousIteration(true);
      console.log(`✅ [${new Date().toLocaleTimeString()}] 第 ${iterationCount} 次掃描輪詢順利完成。`);
    } catch (error) {
      console.error(`❌ [${new Date().toLocaleTimeString()}] 第 ${iterationCount} 次輪詢發生錯誤:`, error.message);
    }
    
    console.log(`\n💤 進入等待狀態，下一輪將在 ${INTERVAL_MINUTES} 分鐘後自動啟動...`);
  };

  // 1. Execute immediately upon startup
  await executeIteration();

  // 2. Set interval loop for perpetual 24/7 operation
  setInterval(executeIteration, INTERVAL_MINUTES * MS_IN_MINUTE);
}

// Start the scheduler and handle unexpected crashes gracefully
startScheduler().catch((error) => {
  console.error('[Critical Error] Scheduler crashed unexpectedly:', error);
  process.exit(1);
});
