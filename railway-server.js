const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

// Start backend server
console.log('Starting backend server...');
const backend = spawn('npm', ['start'], {
  cwd: path.join(__dirname, 'server-helper'),
  stdio: 'inherit',
  shell: true
});

backend.on('error', (err) => {
  console.error('Backend failed to start:', err);
});

// Wait for backend to start
setTimeout(() => {
  console.log('Backend should be running now');
  
  // Proxy /api/* to backend
  app.use('/api', createProxyMiddleware({
    target: 'http://localhost:3000',
    changeOrigin: true,
    pathRewrite: {
      '^/api': '' // Remove /api prefix when forwarding
    },
    onProxyReq: (proxyReq, req, res) => {
      // Forward host headers for video URL generation
      proxyReq.setHeader('X-Forwarded-Host', req.headers.host);
      proxyReq.setHeader('X-Forwarded-Proto', req.protocol);
    },
    logLevel: 'warn'
  }));
  
  // Serve frontend static files
  app.use(express.static(path.join(__dirname, 'desktop-web/dist/spa')));
  
  // SPA fallback - all other routes serve index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'desktop-web/dist/spa/index.html'));
  });
  
  // Start proxy server
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Railway server running on port ${PORT}`);
    console.log(`   Frontend: http://localhost:${PORT}`);
    console.log(`   API Proxy: http://localhost:${PORT}/api/*`);
  });
}, 3000); // Wait 3 seconds for backend to start
