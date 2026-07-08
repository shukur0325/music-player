const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const PORT = process.env.PORT || 3000;

// MIME types
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// Proxy config (use env var for local dev)
function curlWithProxy(url, timeout = 15) {
  const proxy = process.env.http_proxy || process.env.HTTP_PROXY || '';
  const proxyFlag = proxy ? `-x "${proxy}"` : '';
  const ua = JSON.stringify('User-Agent: Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36');
  const ref = JSON.stringify('Referer: https://music.migu.cn/');
  const cmd = `curl -s ${proxyFlag} --max-time ${timeout} -H ${ua} -H ${ref} ${JSON.stringify(url)}`;
  return execSync(cmd, { timeout: (timeout + 5) * 1000, maxBuffer: 5 * 1024 * 1024 });
}

function curlRedirectWithProxy(url, timeout = 10) {
  const proxy = process.env.http_proxy || process.env.HTTP_PROXY || '';
  const proxyFlag = proxy ? `-x "${proxy}"` : '';
  const ua = JSON.stringify('User-Agent: Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36');
  const ref = JSON.stringify('Referer: https://music.migu.cn/');
  const cmd = `curl -sL ${proxyFlag} --max-time ${timeout} -o /dev/null -w '%{url_effective}' -H ${ua} -H ${ref} ${JSON.stringify(url)}`;
  return execSync(cmd, { timeout: (timeout + 5) * 1000, maxBuffer: 1024 }).toString().trim();
}

function sendJSON(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  });
  res.end(JSON.stringify(data));
}

function serveStatic(res, filePath) {
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // Fallback to index.html for SPA routing
      fs.readFile(path.join(__dirname, 'index.html'), (err2, html) => {
        if (err2) {
          res.writeHead(404);
          return res.end('Not Found');
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
      });
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

// ═══ Server ═══
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    });
    return res.end();
  }

  try {
    // ═══ API: Search ═══
    if (pathname === '/api/search') {
      const keyword = url.searchParams.get('keyword') || '';
      const limit = url.searchParams.get('limit') || '30';
      if (!keyword) return sendJSON(res, { code: 400, msg: 'keyword required' });

      const enc = encodeURIComponent(keyword);
      const raw = curlWithProxy(`https://c.musicapp.migu.cn/v1.0/content/search_all.do?text=${enc}&pageNo=1&pageSize=${limit}&isCopyright=1&searchSwitch=%7B%22song%22%3A1%7D`);
      const data = JSON.parse(raw);
      const results = data.songResultData?.result || [];
      const songs = results.map(s => ({
        id: s.id || '',
        copyrightId: s.copyrightId || '',
        contentId: s.contentId || '',
        name: s.name || '',
        singer: (s.singers && s.singers.length > 0) ? s.singers.map(x => x.name).join('/') : (s.singerName || ''),
        album: (s.albums && s.albums.length > 0) ? s.albums[0].name : '',
        duration: s.duration || 0,
        lyricUrl: s.lyricUrl || '',
        img: (s.imgItems && s.imgItems.length > 0) ? s.imgItems[0].img : (s.pic || '')
      }));
      return sendJSON(res, { code: 200, data: { songs, total: String(data.songResultData?.total || results.length) } });
    }

    // ═══ API: Song URL ═══
    if (pathname === '/api/url') {
      const copyrightId = url.searchParams.get('copyrightId') || '';
      const contentId = url.searchParams.get('contentId') || '';
      const resourceType = url.searchParams.get('resourceType') || '2';
      if (!copyrightId || !contentId) return sendJSON(res, { code: 400, msg: 'copyrightId and contentId required' });

      const mp3Url = curlRedirectWithProxy(`https://app.c.nf.migu.cn/MIGUM2.0/v1.0/content/sub/listenSong.do?toneFlag=HQ&netType=01&copyrightId=${copyrightId}&contentId=${contentId}&resourceType=${resourceType}&channel=0`);
      return sendJSON(res, { code: 200, data: { url: mp3Url, br: 128 } });
    }

    // ═══ API: Lyric ═══
    if (pathname === '/api/lyric') {
      const lyricUrl = url.searchParams.get('url') || '';
      if (!lyricUrl) return sendJSON(res, { code: 400, msg: 'url required' });
      const lyric = curlWithProxy(lyricUrl).toString();
      return sendJSON(res, { code: 200, data: { lyric } });
    }

    // ═══ Static files ═══
    let filePath = pathname === '/' ? '/index.html' : pathname;
    serveStatic(res, path.join(__dirname, filePath));

  } catch (e) {
    sendJSON(res, { code: 500, msg: e.message });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🎵 Music Player Server running at http://localhost:${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api/search?keyword=test`);
  console.log(`   Frontend: http://localhost:${PORT}/`);
});