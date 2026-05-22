const { spawn } = require('child_process');
const path = require('path');

const chromePath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = 'C:\\Users\\xbox0\\AppData\\Local\\Google\\Chrome\\User Data';

console.log('Spawning Chrome directly via Node.js...');

const args = [
  '--remote-debugging-port=9222',
  '--headless=new',
  '--disable-gpu',
  '--remote-allow-origins=*',
  `--user-data-dir=${userDataDir}`,
  '--profile-directory=Default'
];

const chrome = spawn(chromePath, args);

chrome.stdout.on('data', (data) => {
  console.log(`[STDOUT]: ${data}`);
});

chrome.stderr.on('data', (data) => {
  console.log(`[STDERR]: ${data}`);
});

chrome.on('close', (code) => {
  console.log(`Chrome process exited with code ${code}`);
});

setTimeout(() => {
  console.log('Killing Chrome...');
  chrome.kill();
}, 10000);
