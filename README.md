# 🎵 音乐播放器 - Music Player

一个拥有**音频可视化**效果的音乐播放器，基于咪咕音乐 API，支持搜索、播放、歌词显示，适配手机和电脑浏览器。

## 在线体验

- **GitHub Pages**: https://shukur0325.github.io/music-player/
- **Vercel 镜像**: https://music-player-three-nu-76.vercel.app/

## 功能特性

- **音乐搜索** — 搜索咪咕音乐曲库，支持中文关键词
- **音频播放** — 在线播放音乐，支持进度拖拽
- **歌词同步** — 实时 LRC 歌词滚动显示
- **音频可视化** — 频谱/波形动画，随音乐律动
- **播放列表** — 搜索结果即列表，点击即播放
- **响应式设计** — 手机和电脑均可使用

## 项目结构

```
music-player/
├── index.html          # 前端页面（播放器界面 + 可视化）
├── api/index.js        # Vercel Serverless Function（API 代理）
├── server.js           # 本地开发服务器（Node.js）
├── vercel.json         # Vercel 部署配置
├── package.json        # 项目配置
└── README.md           # 项目介绍
```

## 本地开发

### 前置要求

- **Node.js** >= 18
- **curl**（API 代理依赖 curl 转发请求）

### 启动

```bash
# 1. 克隆仓库
git clone https://github.com/shukur0325/music-player.git
cd music-player

# 2. 如果本地需要代理（如公司网络限制），设置环境变量
export http_proxy=http://127.0.0.1:7890
export https_proxy=http://127.0.0.1:7890

# 3. 启动服务器
node server.js

# 4. 打开浏览器访问
#    http://localhost:3000
```

### 代理说明

`server.js` 会自动读取 `http_proxy` / `https_proxy` 环境变量。如果本地不需要代理，直接启动即可：

```bash
node server.js
```

## 部署方案

### Vercel（推荐，免费）

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/shukur0325/music-player)

1. 在 Vercel 导入本项目
2. 选择 `main` 分支，Framework 选 **Other**
3. 部署完成后，Vercel 会自动处理 API 路由和静态文件

### GitHub Pages（纯前端）

1. 启用 GitHub Pages，选择 `main` 分支，`/` 目录
2. 前端会通过 `https://music-player-three-nu-76.vercel.app` 调用 API

## API 接口

| 接口 | 方法 | 参数 | 说明 |
|---|---|---|---|
| `/api/search` | GET | `keyword`, `limit` | 搜索歌曲 |
| `/api/url` | GET | `copyrightId`, `contentId`, `resourceType` | 获取歌曲播放地址 |
| `/api/lyric` | GET | `url` | 获取歌词文本 |

## 技术栈

- **前端**: 原生 HTML + CSS + JavaScript（Canvas 可视化）
- **后端代理**: Node.js + Vercel Serverless Functions
- **数据源**: 咪咕音乐公开 API
- **可视化**: Web Audio API + Canvas 频谱分析

## 许可证

MIT License