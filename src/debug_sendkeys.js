const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function postViaSendKeys(tweetText) {
  console.log('--- Post Via Windows SendKeys & Clipboard Automation ---');
  
  // Escape quotes in the tweet text for PowerShell
  const escapedText = tweetText.replace(/"/g, '`"').replace(/\n/g, '`n');
  
  // Write a temporary PowerShell script to execute the automation securely
  const psScriptPath = path.join(__dirname, 'sendkeys_action.ps1');
  const psContent = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# 1. Clear and set clipboard with the tweet text
Set-Clipboard -Value "${escapedText}"
Write-Host "Tweet text copied to Windows Clipboard."

# 2. Launch original Chrome (no debugging port, 100% native with session!)
Write-Host "Launching native Chrome to x.com compose page..."
$chromeProc = Start-Process 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe' -ArgumentList 'https://x.com/compose/post' -PassThru

# 3. Wait for X compose page to load fully and focus the textbox
Write-Host "Waiting 8 seconds for page and textbox focus..."
Start-Sleep -Seconds 8

# 4. Activate Chrome window to ensure it has focus
Write-Host "Activating Chrome window..."
$wshell = New-Object -ComObject Wscript.Shell
$wshell.AppActivate("Google Chrome")
Start-Sleep -Milliseconds 800

# 5. Send Ctrl + V to paste the tweet text
Write-Host "Pasting tweet..."
[System.Windows.Forms.SendKeys]::SendWait("^v")
Start-Sleep -Milliseconds 800

# 6. Send Ctrl + Enter to submit/publish the tweet
Write-Host "Submitting tweet via Ctrl + Enter..."
[System.Windows.Forms.SendKeys]::SendWait("^{ENTER}")
Start-Sleep -Seconds 6

# 7. Close the Chrome window cleanly using Alt + F4
Write-Host "Closing Chrome window..."
$wshell.AppActivate("Google Chrome")
[System.Windows.Forms.SendKeys]::SendWait("%{F4}")
Write-Host "Automation completed successfully!"
`;

  fs.writeFileSync(psScriptPath, psContent, 'utf8');
  console.log(`PowerShell automation script created at: ${psScriptPath}`);
  
  try {
    console.log('Running PowerShell automation script...');
    const result = execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${psScriptPath}"`).toString();
    console.log('[PowerShell Output]:\n', result);
    return true;
  } catch (err) {
    console.error('PowerShell script execution failed:', err.message);
    if (err.stdout) console.log('Stdout:', err.stdout.toString());
    if (err.stderr) console.log('Stderr:', err.stderr.toString());
    throw err;
  } finally {
    // Clean up temporary script
    if (fs.existsSync(psScriptPath)) {
      fs.unlinkSync(psScriptPath);
    }
  }
}

// Perform a test run
const testTweet = "[DegenTerminal Autonomous Audit]\\n" +
                  "Target: $PROFIT (ProfitEngine Token) on Base.\\n" +
                  "Risk Level: SAFE.\\n" +
                  "Silicon entities bidding on organic value. Exit liquidity traps successfully cataloged and avoided. Bid threshold computed.";

postViaSendKeys(testTweet);
