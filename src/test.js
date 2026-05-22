const DegenTerminalAgent = require('./index');

console.log('[Test Suite] Running ProfitEngine DegenTerminal Verification Dry-Run...');

const agent = new DegenTerminalAgent();

const isLive = process.argv.includes('--live');
agent.runAutonomousIteration(isLive)
  .then((posts) => {
    if (posts && posts.length > 0) {
      console.log('\n[Test Result] SUCCESS: Autonomous strategy loop executed, scanned tokens, and generated posts.');
      process.exit(0);
    } else {
      console.error('\n[Test Result] FAILURE: Strategy loop completed but generated no posts.');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('\n[Test Result] CRITICAL ERROR during execution:', error);
    process.exit(1);
  });
