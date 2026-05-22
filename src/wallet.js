const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Keypair } = require('@solana/web3.js');

// AES-256-CBC Encryption Settings
const ALGORITHM = 'aes-256-cbc';
// A local hardcoded salt/passphrase fallback. Real deployments should load this from dotenv.
const ENCRYPTION_KEY = process.env.WALLET_SECRET || 'ProfitEngineAutonomousCryptoKey2026';
const IV_LENGTH = 16; 

class SecureWallet {
  constructor() {
    this.configDir = path.join(__dirname, '../config');
    this.walletFile = path.join(this.configDir, 'wallet.enc');
    this.publicKey = null;
    this.encryptedPrivateKey = null;
    this.iv = null;
    
    // Ensure config directory exists
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }

    this.init();
  }

  /**
   * Encrypt a string using AES-256-CBC
   */
  encrypt(text) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return {
      iv: iv.toString('hex'),
      encryptedData: encrypted.toString('hex')
    };
  }

  /**
   * Decrypt a string using AES-256-CBC
   */
  decrypt(encryptedData, ivHex) {
    const iv = Buffer.from(ivHex, 'hex');
    const key = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(Buffer.from(encryptedData, 'hex'));
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }

  /**
   * Initialize the wallet. Loads existing or creates a new one.
   */
  init() {
    if (fs.existsSync(this.walletFile)) {
      // Load existing encrypted wallet
      try {
        const rawData = fs.readFileSync(this.walletFile, 'utf8');
        const walletData = JSON.parse(rawData);
        
        this.publicKey = walletData.publicKey;
        this.encryptedPrivateKey = walletData.encryptedPrivateKey;
        this.iv = walletData.iv;
        
        console.log(`[SecureWallet] Successfully loaded existing wallet: ${this.publicKey}`);
      } catch (err) {
        console.error('[SecureWallet Error] Failed to load wallet.enc:', err.message);
        throw err;
      }
    } else {
      // Generate a brand new Solana Keypair
      console.log('[SecureWallet] No existing wallet found. Generating a brand new Solana Keypair...');
      const keypair = Keypair.generate();
      
      const pubKey = keypair.publicKey.toBase58();
      // Use Node.js native Hex format to store private key buffer safely without bs58 package compatibility issues
      const privKeyHex = Buffer.from(keypair.secretKey).toString('hex');
      
      // Encrypt the private key
      const encrypted = this.encrypt(privKeyHex);
      
      const walletData = {
        publicKey: pubKey,
        encryptedPrivateKey: encrypted.encryptedData,
        iv: encrypted.iv
      };
      
      fs.writeFileSync(this.walletFile, JSON.stringify(walletData, null, 2), 'utf8');
      
      this.publicKey = pubKey;
      this.encryptedPrivateKey = encrypted.encryptedData;
      this.iv = encrypted.iv;
      
      console.log('\n======================================================');
      console.log('🎉 [SecureWallet] 新錢包已成功安全創建！');
      console.log(`👉 錢包公鑰 (地址): ${this.publicKey}`);
      console.log('👉 加密密文已保存至: config/wallet.enc');
      console.log('⚠️  請往此地址匯入微額交易資金（例如 0.05 ~ 0.1 SOL）以供後續跟單交易測試。');
      console.log('======================================================\n');
    }
  }

  /**
   * Get the decrypted Solana Keypair instance for signing transactions
   */
  getSigner() {
    try {
      const decryptedPrivKeyHex = this.decrypt(this.encryptedPrivateKey, this.iv);
      const secretKey = Uint8Array.from(Buffer.from(decryptedPrivKeyHex, 'hex'));
      return Keypair.fromSecretKey(secretKey);
    } catch (err) {
      console.error('[SecureWallet Error] Failed to decrypt and load signer:', err.message);
      throw new Error('Wallet decryption failed. Please verify WALLET_SECRET matches.');
    }
  }

  /**
   * Get the public address of the wallet
   */
  getPublicKey() {
    return this.publicKey;
  }
}

module.exports = SecureWallet;
