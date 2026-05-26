const fs = require('fs');
const path = require('path');
const config = require('../config');
const { writeData } = require('./write-lock');

/**
 * Log action with tag, type, and push to Web Dashboard log queue atomically
 * @param {string} mode - conservative or aggressive
 * @param {string} tag - Tag category
 * @param {string} type - Log type (INFO, SUCCESS, WARNING, ERROR)
 * @param {string} message - Content
 */
async function logToWeb(mode, tag, type, message) {
  try {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const prefix = mode === 'conservative' ? '🟢[Green]' : '🟣[ZMAC]';
    const logEntry = {
      time: timeStr,
      tag: `${prefix} ${tag || 'AI'}`,
      type: type || 'INFO',
      message: message
    };

    await writeData(async (dataPath) => {
      let currentData = { logs: [] };
      if (fs.existsSync(dataPath)) {
        try {
          currentData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        } catch (e) {
          // ignore parsing error
        }
      }
      if (!currentData.logs) currentData.logs = [];
      
      currentData.logs.push(logEntry);

      // Cap logs
      const maxLogs = config.common ? config.common.MAX_WEB_LOGS : (config.MAX_WEB_LOGS || 40);
      if (currentData.logs.length > maxLogs) {
        currentData.logs.shift();
      }

      fs.writeFileSync(dataPath, JSON.stringify(currentData, null, 2), 'utf8');
    });
  } catch (err) {
    console.error('[Logger] Failed to write web log:', err.message);
  }
}

module.exports = {
  logToWeb
};
