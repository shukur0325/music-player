const https = require('https');
const http = require('http');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36',
        'Referer': 'https://music.migu.cn/'
      },
      timeout: 15000
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
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
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function sendJson(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  });
  res.end(JSON.stringify(data));
}

module.exports = async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname.replace(/\/$/, '');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    });
    return res.end();
  }
  
  try {
    if (path === '/api/search' || path === '/search') {
      const keyword = url.searchParams.get('keyword') || '';
      const limit = url.searchParams.get('limit') || '30';
      if (!keyword) return sendJson(res, { code: 400, msg: 'keyword required' });
      
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
      return sendJson(res, { code: 200, data: { songs, total: String(data.songResultData?.total || results.length) } });
    }
    
    if (path === '/api/url' || path === '/url') {
      const copyrightId = url.searchParams.get('copyrightId') || '';
      const contentId = url.searchParams.get('contentId') || '';
      const resourceType = url.searchParams.get('resourceType') || '2';
      if (!copyrightId || !contentId) return sendJson(res, { code: 400, msg: 'copyrightId and contentId required' });
      
      const mp3Url = await getRedirectUrl(`https://app.c.nf.migu.cn/MIGUM2.0/v1.0/content/sub/listenSong.do?toneFlag=HQ&netType=01&copyrightId=${copyrightId}&contentId=${contentId}&resourceType=${resourceType}&channel=0`);
      return sendJson(res, { code: 200, data: { url: mp3Url, br: 128 } });
    }
    
    if (path === '/api/lyric' || path === '/lyric') {
      const lyricUrl = url.searchParams.get('url') || '';
      if (!lyricUrl) return sendJson(res, { code: 400, msg: 'url required' });
      const lyric = await fetchUrl(lyricUrl);
      return sendJson(res, { code: 200, data: { lyric } });
    }
    
    return sendJson(res, { code: 404, msg: 'Not found' });
    
  } catch(e) {
    return sendJson(res, { code: 500, msg: e.message });
  }
};