/**
 * Music Player API - Vercel Serverless Function
 * 
 * 咪咕音乐 API 代理，使用原生 fetch（无需额外依赖）
 * Vercel 部署无需安装任何 npm 包
 */
module.exports = async (req, res) => {
  const url = new URL(req.url, 'https://localhost');
  const path = url.pathname.replace(/\/$/, '');

  // CORS
  if (req.method === 'OPTIONS') {
    res.writeHead(200, CORS_HEADERS);
    return res.end();
  }

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36',
    'Referer': 'https://music.migu.cn/',
  };

  try {
    if (path === '/api/search' || path === '/search') {
      const keyword = url.searchParams.get('keyword') || '';
      const limit = url.searchParams.get('limit') || '30';
      if (!keyword) return sendJson(res, { code: 400, msg: 'keyword required' });

      const resp = await fetch(
        `https://c.musicapp.migu.cn/v1.0/content/search_all.do?text=${encodeURIComponent(keyword)}&pageNo=1&pageSize=${limit}&isCopyright=1&searchSwitch=%7B%22song%22%3A1%7D`,
        { headers }
      );
      const data = await resp.json();
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
        img: (s.imgItems && s.imgItems.length > 0) ? s.imgItems[0].img : (s.pic || ''),
      }));
      return sendJson(res, { code: 200, data: { songs, total: String(data.songResultData?.total || results.length) } });
    }

    if (path === '/api/url' || path === '/url') {
      const copyrightId = url.searchParams.get('copyrightId') || '';
      const contentId = url.searchParams.get('contentId') || '';
      const resourceType = url.searchParams.get('resourceType') || '2';
      if (!copyrightId || !contentId) return sendJson(res, { code: 400, msg: '参数错误' });

      const resp = await fetch(
        `https://app.c.nf.migu.cn/MIGUM2.0/v1.0/content/sub/listenSong.do?toneFlag=HQ&netType=01&copyrightId=${copyrightId}&contentId=${contentId}&resourceType=${resourceType}&channel=0`,
        { headers, redirect: 'manual' }
      );
      const mp3Url = resp.headers.get('location') || resp.url;
      return sendJson(res, { code: 200, data: { url: mp3Url, br: 128 } });
    }

    if (path === '/api/lyric' || path === '/lyric') {
      const lyricUrl = url.searchParams.get('url') || '';
      if (!lyricUrl) return sendJson(res, { code: 400, msg: 'url required' });
      const resp = await fetch(lyricUrl, { headers });
      const lyric = await resp.text();
      return sendJson(res, { code: 200, data: { lyric } });
    }

    return sendJson(res, { code: 404, msg: 'Not found' });
  } catch (e) {
    return sendJson(res, { code: 500, msg: e.message });
  }
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

function sendJson(res, data, status = 200) {
  res.writeHead(status, {
    ...CORS_HEADERS,
    'Content-Type': 'application/json',
  });
  res.end(JSON.stringify(data));
}