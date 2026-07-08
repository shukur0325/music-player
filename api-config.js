const API_BASE = 'https://music-player-api.shukur0325.workers.dev';

// ═══ API ═══
async function searchSongs(keyword, limit = 30){
  const r = await fetch(`${API_BASE}/api/search?keyword=${encodeURIComponent(keyword)}&limit=${limit}`);
  const j = await r.json();
  if(j.code !== 200) throw new Error(j.msg || '搜索失败');
  return j.data.songs || [];
}
async function getSongUrl(song){
  const r = await fetch(`${API_BASE}/api/url?copyrightId=${song.copyrightId}&contentId=${song.contentId}&resourceType=2`);
  const j = await r.json();
  if(j.code !== 200) throw new Error(j.msg || '获取链接失败');
  return j.data.url;
}
async function getLyric(lyricUrl){
  if(!lyricUrl) return '';
  const r = await fetch(`${API_BASE}/api/lyric?url=${encodeURIComponent(lyricUrl)}`);
  const j = await r.json();
  if(j.code !== 200) return '';
  return j.data.lyric || '';
}