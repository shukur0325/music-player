const express = require('express');
const https = require('https');
const http = require('http');
const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36',
        'Referer': 'https://music.migu.cn/'
      },
      timeout: 15000
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject).setTimeout(15000, function() { this.destroy(); reject(new Error('timeout')); });
  });
}

function getRedirectUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36',
        'Referer': 'https://music.migu.cn/'
      },
      timeout: 10000
    }, (res) => {
      resolve(res.responseUrl || res.headers.location || url);
    });
    req.on('error', reject);
    req.setTimeout(10000, function() { this.destroy(); reject(new Error('timeout')); });
  });
}

app.get('/api/search', async (req, res) => {
  try {
    const { keyword, limit = 30 } = req.query;
    if (!keyword) return res.json({ code: 400, msg: 'keyword required' });
    const enc = encodeURIComponent(keyword);
    const raw = await fetchUrl(`https://c.musicapp.migu.cn/v1.0/content/search_all.do?text=${enc}&pageNo=1&pageSize=${limit}&isCopyright=1&searchSwitch=%7B%22song%22%3A1%7D`);
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
    res.json({ code: 200, data: { songs, total: String(data.songResultData?.total || results.length) } });
  } catch(e) {
    res.json({ code: 500, msg: e.message });
  }
});

app.get('/api/url', async (req, res) => {
  try {
    const { copyrightId, contentId, resourceType = '2' } = req.query;
    if (!copyrightId || !contentId) return res.json({ code: 400, msg: 'copyrightId and contentId required' });
    const mp3Url = await getRedirectUrl(`https://app.c.nf.migu.cn/MIGUM2.0/v1.0/content/sub/listenSong.do?toneFlag=HQ&netType=01&copyrightId=${copyrightId}&contentId=${contentId}&resourceType=${resourceType}&channel=0`);
    res.json({ code: 200, data: { url: mp3Url, br: 128 } });
  } catch(e) {
    res.json({ code: 500, msg: e.message });
  }
});

app.get('/api/lyric', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.json({ code: 400, msg: 'url required' });
    const lyric = await fetchUrl(url);
    res.json({ code: 200, data: { lyric } });
  } catch(e) {
    res.json({ code: 500, msg: e.message });
  }
});

// Serve frontend static files from the repo
app.use(express.static(__dirname));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API server running on port ${PORT}`);
});