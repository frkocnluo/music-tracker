/**
 * HTML 模板与页面布局生成器
 * 语义化 HTML5，零运行时依赖，完全支持 GitHub Pages 静态部署
 */

export function renderPage({ entries, liveStreams, sources }) {
  // 提取首字母作为黑胶唱片封套文字
  const getInitials = (str) => {
    if (!str) return 'SR';
    const words = str.trim().split(/\s+/);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  };

  // 生成卡片 HTML
  const cardsHtml = entries.map(entry => {
    const initials = getInitials(entry.title);
    const bgStyle = entry.coverGradient || 'linear-gradient(135deg, #1f1c2c 0%, #928dab 100%)';
    const linksJson = JSON.stringify(entry.links || {}).replace(/"/g, '&quot;');
    const searchString = `${entry.title} ${entry.artist} ${entry.label || ''} ${(entry.genres || []).join(' ')} ${entry.summary || ''}`;

    const badgesHtml = (entry.sources || []).map(s => {
      const cls = (s.source || '').toLowerCase().replace(/[^a-z]/g, '');
      return `<span class="source-badge ${cls}" title="${s.note || ''}">${s.source} · ${s.badge}</span>`;
    }).join('');

    const genresHtml = (entry.genres || []).map(g => {
      return `<span class="genre-tag">${g}</span>`;
    }).join('');

    const linksHtml = `
      ${entry.links?.original ? `<a href="${entry.links.original}" target="_blank" rel="noopener" class="ext-link">原文直达 ↗</a>` : ''}
      ${entry.links?.bandcamp ? `<a href="${entry.links.bandcamp}" target="_blank" rel="noopener" class="ext-link">Bandcamp ↗</a>` : ''}
      ${entry.links?.streetvoice ? `<a href="${entry.links.streetvoice}" target="_blank" rel="noopener" class="ext-link">街声 ↗</a>` : ''}
      ${entry.links?.spotify ? `<a href="${entry.links.spotify}" target="_blank" rel="noopener" class="ext-link">Spotify ↗</a>` : ''}
      ${entry.links?.netease ? `<a href="${entry.links.netease}" target="_blank" rel="noopener" class="ext-link">网易云 ↗</a>` : ''}
    `;

    return `
      <article class="release-card ${entry.isHighlight ? 'highlight' : ''}" 
               data-category="${entry.category}" 
               data-genres="${(entry.genres || []).join(',')}"
               data-search="${searchString.replace(/"/g, '&quot;')}"
               data-title="${entry.title.replace(/"/g, '&quot;')}"
               data-artist="${entry.artist.replace(/"/g, '&quot;')}"
               data-preview="${entry.audioPreview || ''}"
               data-links="${linksJson}">
        <div class="card-top">
          <div class="cover-sleeve" title="点击试听 / 查看">
            <div class="sleeve-jacket" style="background: ${bgStyle};">
              <span class="sleeve-initials">${initials}</span>
            </div>
            <div class="vinyl-disc">
              <div class="vinyl-center-label"></div>
            </div>
          </div>
          <div class="card-info">
            <h3 class="card-title" title="${entry.title}">${entry.title}</h3>
            <div class="card-artist">${entry.artist}</div>
            <div class="card-meta-line">
              <span class="live-date-pill">⚡ ${entry.releaseDate || '实时入库'}</span>
              <span>•</span>
              <span>${entry.label || '信源首发'}</span>
            </div>
          </div>
        </div>

        <div class="source-badges">
          ${badgesHtml}
        </div>

        <p class="card-summary">${entry.summary || '暂无详细描述。'}</p>

        <div class="genre-tags">
          ${genresHtml}
        </div>

        <div class="card-actions">
          <button class="play-preview-btn" type="button">
            <span>▶</span> 快速试听
          </button>
          <div class="platform-links">
            ${linksHtml}
          </div>
        </div>
      </article>
    `;
  }).join('\n');

  // 生成实时电波流 (右侧栏)
  const streamItemsHtml = liveStreams.flatMap(source => {
    return (source.items || []).map(item => ({
      ...item,
      sourceName: source.sourceName,
      badge: source.badge,
      color: source.color
    }));
  }).sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
    .slice(0, 20)
    .map(item => `
      <div class="stream-item">
        <div class="stream-item-top">
          <span class="stream-source-tag" style="color: ${item.color}">${item.badge}</span>
          <span class="stream-date">${item.pubDate}</span>
        </div>
        <a href="${item.link}" target="_blank" rel="noopener" class="stream-link">
          ${item.title}
        </a>
      </div>
    `).join('\n');

  // 计算各分类计数
  const sinophoneCount = entries.filter(e => e.category === 'sinophone').length;
  const globalCount = entries.filter(e => e.category === 'global').length;
  const criticalCount = entries.filter(e => e.category === 'critical').length;

  const timestamp = Date.now();

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
  <meta http-equiv="Pragma" content="no-cache">
  <meta http-equiv="Expires" content="0">
  <title>SONIC RADAR · 实时音乐挖掘雷达 (Global &amp; Sinophone)</title>
  <meta name="description" content="实时同步 Pitchfork、StreetVoice 街声、Bandcamp Daily、The Quietus、Freshmusic、Fantano 的最新独立先锋音乐发布。">
  
  <meta property="og:type" content="website">
  <meta property="og:title" content="SONIC RADAR · 实时音乐挖掘雷达">
  <meta property="og:description" content="零延迟、零算法规训的实时独立音乐挖掘看板。">

  <link rel="stylesheet" href="assets/css/style.css?v=${timestamp}">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220%22%3E<text y=%2226%22 font-size=%2224%22>💽</text></svg>">
</head>
<body>

  <!-- 顶部导航 -->
  <header class="site-header">
    <div class="header-container">
      <div class="brand-wrapper">
        <div class="brand-logo-disc"></div>
        <div>
          <div class="brand-title">
            SONIC RADAR <span class="brand-tag">REALTIME FEED</span>
          </div>
          <div class="brand-subtitle">音轨挖掘雷达 · 实时捕获全球先锋与华语独立最新发布</div>
        </div>
      </div>

      <div class="sources-ticker">
        <span class="pulse-dot"></span>
        <span id="live-indicator">LIVE FEED ACTIVE: ${entries.length} 实时条目</span>
      </div>

      <div style="display: flex; gap: 8px; align-items: center;">
        <button id="force-refresh-btn" type="button" class="github-badge-link" style="cursor: pointer; background: rgba(0, 242, 254, 0.1); border-color: rgba(0, 242, 254, 0.3); color: var(--accent-cyan);" title="跳过浏览器缓存，拉取最新实时数据">
          ⚡ 刷新实时流
        </button>

        <a href="https://github.com/frkocnluo/music-tracker" target="_blank" rel="noopener" class="github-badge-link">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
          </svg>
          GitHub 仓库
        </a>
      </div>
    </div>
  </header>

  <!-- 主体内容 -->
  <main class="main-container">

    <!-- 宣言 Banner -->
    <section class="hero-banner">
      <div class="hero-text">
        <h1>零延迟直连：今天正在发生的音乐。</h1>
        <p>
          彻底抛弃几个月前的滞后冷饭。本看板直接打通 Pitchfork 今日评测、StreetVoice 街声今日推荐、Bandcamp Daily 深度首发、The Quietus 激进前卫、Freshmusic 华语季选以及 Fantano 实时视频流，所有卡片均来自信源第一线实时入库。
        </p>
      </div>
      <div class="hero-meta-stats">
        <div class="stat-box">
          <div class="stat-value">${entries.length}</div>
          <div class="stat-label">今日实时作品</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">6+</div>
          <div class="stat-label">全通直连信源</div>
        </div>
      </div>
    </section>

    <!-- 控制面板 -->
    <section class="control-panel">
      <!-- 视角切换 -->
      <div class="view-tabs">
        <button class="tab-btn active" data-category="all" type="button">
          全部实时作品 <span class="tab-count">${entries.length}</span>
        </button>
        <button class="tab-btn" data-category="sinophone" type="button">
          华语独立一线 (StreetVoice / FMA) <span class="tab-count">${sinophoneCount}</span>
        </button>
        <button class="tab-btn" data-category="global" type="button">
          全球先锋地下 (Bandcamp / Quietus) <span class="tab-count">${globalCount}</span>
        </button>
        <button class="tab-btn" data-category="critical" type="button">
          权威乐评实时 (Pitchfork / Fantano) <span class="tab-count">${criticalCount}</span>
        </button>
      </div>

      <!-- 搜索与风格过滤 -->
      <div class="filter-row">
        <div class="genre-pills">
          <button class="pill-btn active" data-genre="all" type="button">全部流派</button>
          <button class="pill-btn" data-genre="Electronic / Club" type="button">Club / 电子</button>
          <button class="pill-btn" data-genre="Post-Punk / Rock" type="button">后朋 / 摇滚</button>
          <button class="pill-btn" data-genre="Indie Pop / Bedroom" type="button">独立流行 / 卧室</button>
          <button class="pill-btn" data-genre="Ambient / Drone" type="button">环境 / 氛围</button>
          <button class="pill-btn" data-genre="Neo-Soul / Jazz / Beats" type="button">爵士 / 灵歌 / Beats</button>
          <button class="pill-btn" data-genre="Avant-Garde / Noise" type="button">先锋 / 实验</button>
        </div>

        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input type="text" class="search-input" placeholder="实时检索唱片、音乐人、关键词...">
        </div>
      </div>
    </section>

    <!-- 核心布局：双栏 (主看板 + 实时信源电波) -->
    <div class="layout-columns">
      <!-- 唱片盒 Crate -->
      <section class="release-grid" id="release-grid">
        ${cardsHtml}
      </section>

      <!-- 右侧实时电波流 -->
      <aside class="live-stream-panel">
        <div class="stream-header">
          <div class="stream-title">
            <span>📡</span> 实时电波流 (RSS STREAM)
          </div>
          <span style="font-size: 0.7rem; color: var(--accent-cyan); font-family: var(--font-mono);">
            LIVE SYNC
          </span>
        </div>
        <div class="stream-list">
          ${streamItemsHtml}
        </div>
      </aside>
    </div>

  </main>

  <!-- 底部常驻试听播放器 Dock -->
  <footer class="player-dock" id="player-dock" style="display: none;">
    <div class="player-now-playing">
      <div class="player-vinyl-thumb" id="player-thumb">
        <div class="player-vinyl-center"></div>
      </div>
      <div class="player-text">
        <div class="player-title" id="player-title">未选择曲目</div>
        <div class="player-artist" id="player-artist">点击任意卡片试听</div>
      </div>
    </div>

    <div class="player-controls">
      <button class="dock-btn" id="play-toggle-btn" type="button" title="播放/暂停">▶</button>
      <div class="waveform-bars">
        <div class="wave-bar"></div>
        <div class="wave-bar"></div>
        <div class="wave-bar"></div>
        <div class="wave-bar"></div>
        <div class="wave-bar"></div>
        <div class="wave-bar"></div>
      </div>
    </div>

    <div class="player-outbound" id="player-links">
      <!-- 动态填充外链 -->
    </div>
  </footer>

  <!-- 客户端交互逻辑 -->
  <script src="assets/js/app.js?v=${timestamp}"></script>
</body>
</html>
`;
}
