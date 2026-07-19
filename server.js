const express = require('express');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

const app = express();

// GitHub release details
const GITHUB_RELEASE_URL = 'https://github.com/Axeb2b/codebhai-/releases/download/v2.3.5/NextGen.mParivahan.apk';
const APP_NAME = 'NextGen mParivahan';
const APP_VERSION = 'v2.3.5';

// Logs directory
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// ============ MIDDLEWARE ============

// Static files
app.use(express.static('public'));

// Log function
function logDownload(ip, userAgent, status, isBot) {
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp} | IP: ${ip} | Status: ${status} | Bot: ${isBot} | UA: ${userAgent}\n`;
  fs.appendFileSync(path.join(logsDir, 'downloads.log'), logEntry);
}

// ============ BOT DETECTION ============

function detectBot(userAgent) {
  if (!userAgent) return true;

  const botPatterns = [
    'bot', 'crawler', 'spider', 'scraper',
    'curl', 'wget', 'python', 'java',
    'perl', 'ruby', 'php', 'node',
    'httpclient', 'requests', 'urllib',
    'scrapy', 'selenium', 'puppeteer',
    'phantom', 'headless', 'chrome-lighthouse',
    'googlebot', 'bingbot', 'slurp'
  ];

  const ua = userAgent.toLowerCase();
  return botPatterns.some(pattern => ua.includes(pattern));
}

// ============ RATE LIMITING ============

const downloadLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 1, // 1 download per 24 hours
  message: '⏱️ Download limit reached. Only 1 download per IP per 24 hours!',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req, res) => {
    // Admin bypass (optional)
    return req.query.admin === process.env.ADMIN_KEY;
  }
});

// ============ ROUTES ============

// Home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Download route - WITH BOT BLOCKING + RATE LIMITING
app.get('/download', downloadLimiter, (req, res) => {
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const ip = req.ip;
  
  // Bot detection
  const isBot = detectBot(userAgent);
  
  if (isBot) {
    logDownload(ip, userAgent, 'BLOCKED_BOT', true);
    return res.status(403).json({
      error: '❌ Bot access denied!',
      message: 'Automated downloads are not allowed.',
      status: 'blocked'
    });
  }
  
  // Valid download
  logDownload(ip, userAgent, 'SUCCESS', false);
  
  res.json({
    status: 'success',
    message: '✅ Redirecting to download...',
    download_url: GITHUB_RELEASE_URL,
    app_name: APP_NAME,
    version: APP_VERSION
  });
  
  // Redirect after JSON response
  setTimeout(() => {
    res.redirect(GITHUB_RELEASE_URL);
  }, 500);
});

// Download redirect (direct)
app.get('/direct', downloadLimiter, (req, res) => {
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const ip = req.ip;
  const isBot = detectBot(userAgent);
  
  if (isBot) {
    logDownload(ip, userAgent, 'BLOCKED_BOT', true);
    return res.status(403).send('❌ Bot access denied!');
  }
  
  logDownload(ip, userAgent, 'REDIRECT', false);
  res.redirect(GITHUB_RELEASE_URL);
});

// API - Check status
app.get('/api/status', (req, res) => {
  res.json({
    app: APP_NAME,
    version: APP_VERSION,
    status: 'online',
    github_url: GITHUB_RELEASE_URL
  });
});

// API - Download logs (protected)
app.get('/api/logs', (req, res) => {
  const adminKey = req.query.key;
  
  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const logs = fs.readFileSync(path.join(logsDir, 'downloads.log'), 'utf-8');
    res.json({
      logs: logs.split('\n').filter(l => l.trim()),
      total_lines: logs.split('\n').length
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not read logs' });
  }
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: '❌ Route not found' });
});

// ============ SERVER START ============

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════╗
║   🚀 APK Download Server Running   ║
╠════════════════════════════════════╣
║ App: ${APP_NAME.padEnd(28)} ║
║ Version: ${APP_VERSION.padEnd(26)} ║
║ Port: ${PORT.toString().padEnd(28)} ║
║ Bot Blocking: ✅ ENABLED           ║
║ Rate Limiting: ✅ ENABLED          ║
╚════════════════════════════════════╝

📥 Download URL: http://localhost:${PORT}/download
🔗 Direct URL: http://localhost:${PORT}/direct
📊 Status: http://localhost:${PORT}/api/status
📋 Logs: http://localhost:${PORT}/api/logs?key=YOUR_ADMIN_KEY
  `);
});
