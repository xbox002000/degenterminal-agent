const path = require('path');

let pendingPromise = Promise.resolve();

function getDataPath() {
  return path.join(__dirname, '../../public/data.json');
}

async function writeData(dataFn) {
  await pendingPromise;
  let resolve;
  pendingPromise = new Promise(r => { resolve = r; });
  try {
    const result = await dataFn(getDataPath());
    return result;
  } finally {
    resolve();
  }
}

module.exports = { getDataPath, writeData };
