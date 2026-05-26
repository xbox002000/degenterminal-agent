const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class BinanceSquareClient {
  constructor() {
    this.apiKey = process.env.BINANCE_SQUARE_OPENAPI_KEY || process.env.BINANCE_SQUARE_API_KEY || '';
    this.baseUrlV1 = 'https://www.binance.com/bapi/composite/v1/public/pgc/openApi';
    this.baseUrlV2 = 'https://www.binance.com/bapi/composite/v2/public/pgc/openApi';
    this.POLL_INTERVAL_MS = 3000;
    this.MAX_POLL_RETRIES = 10;
    this.contentTypeMap = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp'
    };
  }

  getContentType(filePath) {
    const ext = path.extname(filePath).slice(1).toLowerCase();
    return this.contentTypeMap[ext] || 'application/octet-stream';
  }

  isConfigured() {
    return !!this.apiKey && this.apiKey.trim() !== '';
  }

  getAuthHeaders() {
    return {
      'X-Square-OpenAPI-Key': this.apiKey,
      'Content-Type': 'application/json',
      'clienttype': 'binanceSkill'
    };
  }

  async callApi(endpoint, body, baseUrl = this.baseUrlV2) {
    const url = `${baseUrl}${endpoint}`;
    try {
      const response = await axios.post(url, body, {
        headers: this.getAuthHeaders(),
        timeout: 30000
      });

      // Handle 504 gracefully for content/add
      if (endpoint === '/content/add' && response.status === 504) {
        return { id: null, shareLink: null, publishStatus: 'success_without_post_id' };
      }

      const resData = response.data;
      if (resData && resData.code === '000000') {
        return resData.data;
      }
      const errorCode = resData?.code || 'UNKNOWN_ERROR';
      const errorMsg = resData?.message || resData?.desc || 'No error message';
      throw new Error(`API error [${errorCode}]: ${errorMsg}`);
    } catch (error) {
      if (error.response && error.response.status === 504 && endpoint === '/content/add') {
        return { id: null, shareLink: null, publishStatus: 'success_without_post_id' };
      }
      if (error.message && error.message.startsWith('API error')) {
        throw error;
      }
      const detail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      throw new Error(`API error: ${detail}`);
    }
  }

  async uploadToS3(presignedUrl, filePath, contentType) {
    const fileBuffer = fs.readFileSync(filePath);
    await axios.put(presignedUrl, fileBuffer, {
      headers: { 'Content-Type': contentType },
      timeout: 60000
    });
  }

  async uploadImage(imagePath) {
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image not found: ${imagePath}`);
    }
    const imageName = path.basename(imagePath);
    const contentType = this.getContentType(imagePath);

    console.log(`[BinanceSquare] Uploading image: ${imageName}`);
    const { presignedUrl, fileTicket } = await this.callApi('/image/presignedUrl', {
      imageName: imageName
    });

    await this.uploadToS3(presignedUrl, imagePath, contentType);
    console.log(`[BinanceSquare] Uploaded to S3, polling processing status...`);

    const imageStatus = await this.pollImageStatus(fileTicket);
    console.log(`[BinanceSquare] Image ready: ${imageStatus.imageUrl}`);
    return imageStatus.imageUrl;
  }

  async pollImageStatus(fileTicket) {
    for (let i = 0; i < this.MAX_POLL_RETRIES; i++) {
      const data = await this.callApi('/image/imageStatus', { fileTicket });
      if (data.status === 1) return data;
      if (data.status === 2) throw new Error(`Image processing failed: ${data.failedReason}`);
      console.log(`  Processing... (${i + 1}/${this.MAX_POLL_RETRIES})`);
      await new Promise(r => setTimeout(r, this.POLL_INTERVAL_MS));
    }
    throw new Error(`Image upload poll timed out after ${this.MAX_POLL_RETRIES} retries`);
  }

  async publishPost(content, options = {}) {
    if (!this.isConfigured()) {
      console.warn('⚠️ [BinanceSquare] API Key is not configured in .env. Skipping publish.');
      return { success: false, error: 'API Key not configured' };
    }

    if (!content || content.trim() === '') {
      return { success: false, error: 'Content is empty' };
    }

    const title = typeof options === 'string' ? null : options.title || null;
    const imagePath = typeof options === 'string' ? options : (options.imagePath || null);
    const coverPath = typeof options === 'string' ? null : (options.coverPath || null);

    const contentType = title ? 2 : 1;
    const body = { contentType, bodyTextOnly: content };

    if (title) {
      body.title = title;
      const actualCoverPath = coverPath || imagePath;
      if (actualCoverPath && fs.existsSync(actualCoverPath)) {
        try {
          const coverUrl = await this.uploadImage(actualCoverPath);
          body.cover = coverUrl;
        } catch (imgErr) {
          console.warn('[BinanceSquare] ⚠️ Cover image upload failed, publishing without cover:', imgErr.message);
        }
      }
    } else if (imagePath && fs.existsSync(imagePath)) {
      try {
        const imageUrl = await this.uploadImage(imagePath);
        body.imageList = [imageUrl];
      } catch (imgErr) {
        console.warn('[BinanceSquare] ⚠️ Image upload failed, publishing text-only:', imgErr.message);
      }
    }

    console.log(`🚀 [BinanceSquare] Publishing ${title ? 'article' : 'post'} (Length: ${content.length})...`);

    try {
      const result = await this.callApi('/content/add', body, this.baseUrlV1);
      console.log('✅ [BinanceSquare] Post published successfully!');
      return {
        success: true,
        data: result,
        shareLink: result?.shareLink || null,
        id: result?.id || null
      };
    } catch (error) {
      console.error('❌ [BinanceSquare] Publish failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new BinanceSquareClient();
