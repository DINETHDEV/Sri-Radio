require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const https = require('https');

const authRoutes = require('./routes/auth');
const channelRoutes = require('./routes/channels');
const mongoose = require('mongoose');

const app = express();

// Database Connection
mongoose.connect(process.env.MONGO_URI, { family: 4 })
  .then(() => console.log('📦 Connected to MongoDB Atlas'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/channels', channelRoutes);

// ── Universal Stream / HLS Proxy ─────────────────────────────
// Proxies audio/video streams and m3u8 playlists to avoid CORS
// Usage: /api/stream?url=https://...
app.get('/api/stream', (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ message: 'url param required' });

  const decodedUrl = decodeURIComponent(url);
  const protocol = decodedUrl.startsWith('https') ? https : http;

  const options = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Accept': '*/*',
      'Accept-Encoding': 'identity',
      'Connection': 'keep-alive',
    }
  };

  protocol.get(decodedUrl, options, (streamRes) => {
    const contentType = streamRes.headers['content-type'] || 
      (decodedUrl.includes('.m3u8') ? 'application/vnd.apple.mpegurl' : 'application/octet-stream');

    // If it's an m3u8 playlist, rewrite segment URLs to go through our proxy too
    if (decodedUrl.includes('.m3u8') || contentType.includes('mpegurl')) {
      let body = '';
      streamRes.setEncoding('utf8');
      streamRes.on('data', chunk => body += chunk);
      streamRes.on('end', () => {
        const baseUrl = decodedUrl.substring(0, decodedUrl.lastIndexOf('/') + 1);
        // Rewrite relative URLs in the m3u8 to absolute proxy URLs
        const rewritten = body.replace(/^(?!#)(.+\.(ts|m3u8|aac|mp4|m4s))$/gm, (match) => {
          if (match.startsWith('http')) return match;
          const absoluteUrl = baseUrl + match;
          return `/api/stream?url=${encodeURIComponent(absoluteUrl)}`;
        });
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'no-cache');
        res.send(rewritten);
      });
    } else {
      // For .ts segments and audio streams, pipe directly
      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Transfer-Encoding', 'chunked');
      res.setHeader('Cache-Control', 'no-cache');
      streamRes.pipe(res);
    }
  }).on('error', (err) => {
    console.error('Stream proxy error:', err.message);
    res.status(502).json({ message: 'Stream unavailable' });
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ SriRadio backend running on port ${PORT}`);
});
