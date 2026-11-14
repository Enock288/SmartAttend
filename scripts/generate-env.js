const fs = require('fs');
const path = require('path');

const apiUrl = (process.env.PUBLIC_API_URL || 'https://smartattend-1-bptv.onrender.com').trim();
const contents = `window.SMARTATTEND_API_URL = ${JSON.stringify(apiUrl)};\n`;
fs.writeFileSync(path.join(__dirname, '..', 'env-config.js'), contents, 'utf8');
