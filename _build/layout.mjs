/**
 * HTML 模板与页面布局生成器
 * 支持中英双语切换与多平台共识评分 (Pitchfork, RYM, AOTY, 豆瓣)
 */

export function renderPage({ entries, liveStreams, sources }) {
  const getInitials = (str) => {
    if (!str) return 'SR';
    const words = str.trim().split(/\s+/);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  };

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
      ${entry.links?.original ? `<a href="${entry.links.original}" target="_blank" rel="noopener" class="ext-link">Original ↗</a>` : ''}
      ${entry.links?.bandcamp ? `<a href="${entry.links.bandcamp}" target="_blank" rel="noopener" class="ext-link">Bandcamp ↗</a>` : ''}
      ${entry.links?.spotify ? `<a href="${entry.links.spotify}" target="_blank" rel="noopener" class="ext-link">Spotify ↗</a>` : ''}
      ${entry.links?.youtube ? `<a href="${entry.links.youtube}" target="_blank" rel="noopener" class="ext-link">YouTube ↗</a>` : ''}
    `;

    // 多平台评分卡片
    const scores = entry.scores || {};
    const scoresHtml = `
      <div class="scores-bar" title="Consensus Scores / 多平台共识评分">
        <div class="score-pill pitchfork ${scores.pitchfork?.bnm ? 'bnm' : ''}" title="Pitchfork Score">
          <span class="score-label">P4K</span>
          <span class="score-val">${scores.pitchfork?.score || '-'}</span>
          ${scores.pitchfork?.bnm ? '<span class="score-extra">BNM</span>' : ''}
        </div>
        <div class="score-pill fantano" title="The Needle Drop (Fantano) Review Score">
          <span class="score-label">TND</span>
          <span class="score-val">${scores.fantano?.score || '-'}</span>
        </div>
        <div class="score-pill rym" title="RateYourMusic Rating (0.0-5.0)">
          <span class="score-label">RYM</span>
          <span class="score-val">${scores.rym?.score || '-'}</span>
        </div>
        <div class="score-pill aoty" title="Album of the Year (0-100)">
          <span class="score-label">AOTY</span>
          <span class="score-val">${scores.aoty?.score || '-'}</span>
        </div>
        <div class="score-pill douban" title="豆瓣音乐评分 (0.0-10.0)">
          <span class="score-label">豆瓣</span>
          <span class="score-val">${scores.douban?.score || '-'}</span>
        </div>
      </div>
    `;

    return `
      <article class="release-card ${entry.isHighlight ? 'highlight' : ''}" 
               data-category="${entry.category}" 
               data-genres="${(entry.genres || []).join(',')}"
               data-search="${searchString.replace(/"/g, '&quot;')}"
               data-title="${entry.title.replace(/"/g, '&quot;')}"
               data-artist="${entry.artist.replace(/"/g, '&quot;')}"
               data-preview="${entry.audioPreview || ''}"
               data-cover="${entry.coverArt || ''}"
               data-links="${linksJson}">
        <div class="card-top">
          <div class="cover-sleeve" title="Preview / Details">
            <div class="sleeve-jacket" style="background: ${bgStyle};">
              ${entry.coverArt ? `<img src="${entry.coverArt}" alt="${entry.title.replace(/"/g, '&quot;')}" class="sleeve-cover-img" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display='none'">` : ''}
              <span class="sleeve-initials">${initials}</span>
            </div>
            <div class="vinyl-disc">
              <div class="vinyl-center-label" style="${entry.coverArt ? `background-image: url('${entry.coverArt}'); background-size: cover; background-position: center;` : ''}"></div>
            </div>
          </div>
          <div class="card-info">
            <h3 class="card-title" title="${entry.title}">${entry.title}</h3>
            <div class="card-artist">${entry.artist}</div>
            <div class="card-meta-line">
              <span class="live-date-pill">⚡ ${entry.releaseDate || 'LIVE DROP'}</span>
              <span>•</span>
              <span>${entry.label || 'Editorial Pick'}</span>
            </div>
          </div>
        </div>

        <div class="source-badges">
          ${badgesHtml}
        </div>

        ${scoresHtml}

        <p class="card-summary">${entry.summary || 'No review description available.'}</p>

        <div class="genre-tags">
          ${genresHtml}
        </div>

        <div class="card-actions">
          <button class="play-preview-btn" type="button">
            <span>▶</span> <span data-i18n="btn_preview">试听 Preview</span>
          </button>
          <div class="platform-links">
            ${linksHtml}
          </div>
        </div>
      </article>
    `;
  }).join('\n');

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

  const avantGardeCount = entries.filter(e => e.category === 'avant-garde').length;
  const undergroundCount = entries.filter(e => e.category === 'underground').length;
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
  <title>SONIC RADAR · 全球音乐挖掘雷达 (Global Avant-Garde &amp; Consensus)</title>
  <meta name="description" content="实时同步 Pitchfork、Bandcamp Daily、The Quietus、Stereogum、The Needle Drop 的新发音乐与多平台评分 (Pitchfork, RYM, AOTY, 豆瓣)。">
  
  <meta property="og:type" content="website">
  <meta property="og:title" content="SONIC RADAR · Global Music Radar">
  <meta property="og:description" content="零延迟直连：全球先锋实验、地下独立与权威共识评分雷达。">

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
            SONIC RADAR <span class="brand-tag" data-i18n="brand_tag">全球雷达</span>
          </div>
          <div class="brand-subtitle" data-i18n="brand_subtitle">全球先锋实验、地下独立与多平台评分实时看板</div>
        </div>
      </div>

      <div class="sources-ticker">
        <span class="pulse-dot"></span>
        <span id="live-indicator" data-i18n="live_feed" data-i18n-count="${entries.length}">实时在线: ${entries.length} 张发行</span>
      </div>

      <div class="header-actions">
        <!-- 中英切换 -->
        <button id="lang-toggle-btn" type="button" class="lang-toggle-btn" title="切换语言 / Switch Language">
          <span class="lang-text zh">中文</span>
          <span class="lang-divider">/</span>
          <span class="lang-text en">EN</span>
        </button>

        <!-- 刷新数据 -->
        <button id="force-refresh-btn" type="button" class="github-badge-link" style="cursor: pointer; background: rgba(0, 242, 254, 0.1); border-color: rgba(0, 242, 254, 0.3); color: var(--accent-cyan);" title="跳过缓存刷新最新数据">
          <span data-i18n="sync_btn">⚡ 刷新实时流</span>
        </button>

        <a href="https://github.com/frkocnluo/music-tracker" target="_blank" rel="noopener" class="github-badge-link">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
          </svg>
          GitHub
        </a>
      </div>
    </div>
  </header>

  <!-- 主体内容 -->
  <main class="main-container">

    <!-- 宣言 Banner -->
    <section class="hero-banner">
      <div class="hero-text">
        <h1 data-i18n="hero_title">摆脱算法规训，重返一手声音。</h1>
        <p data-i18n="hero_desc">
          直接打通 Pitchfork 评测、Bandcamp Daily 深度首发、The Quietus 前卫摇滚与 Stereogum 重点大碟，并实时集成 Pitchfork / RYM / AOTY / 豆瓣 四大多维权威评分，彻底告别滞后的年终总结。
        </p>
      </div>
      <div class="hero-meta-stats">
        <div class="stat-box">
          <div class="stat-value">${entries.length}</div>
          <div class="stat-label" data-i18n="stat_releases">活跃发行</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">5+</div>
          <div class="stat-label" data-i18n="stat_channels">直连信源</div>
        </div>
      </div>
    </section>

    <!-- 控制面板 -->
    <section class="control-panel">
      <!-- 视角切换 -->
      <div class="view-tabs">
        <button class="tab-btn active" data-category="all" type="button">
          <span data-i18n="tab_all">全部发行</span> <span class="tab-count">${entries.length}</span>
        </button>
        <button class="tab-btn" data-category="avant-garde" type="button">
          <span data-i18n="tab_avantgarde">先锋与实验 (The Quietus / The Wire)</span> <span class="tab-count">${avantGardeCount}</span>
        </button>
        <button class="tab-btn" data-category="underground" type="button">
          <span data-i18n="tab_underground">Bandcamp 深度发掘</span> <span class="tab-count">${undergroundCount}</span>
        </button>
        <button class="tab-btn" data-category="critical" type="button">
          <span data-i18n="tab_critical">权威乐评 (Pitchfork / Stereogum / Fantano)</span> <span class="tab-count">${criticalCount}</span>
        </button>
      </div>

      <!-- 搜索与风格过滤 -->
      <div class="filter-row">
        <div class="genre-pills">
          <button class="pill-btn active" data-genre="all" type="button" data-i18n="genre_all">全部流派</button>
          <button class="pill-btn" data-genre="Electronic / Club" type="button" data-i18n="genre_club">Club / 电子</button>
          <button class="pill-btn" data-genre="Post-Punk / Rock" type="button" data-i18n="genre_rock">后朋 / 摇滚</button>
          <button class="pill-btn" data-genre="Indie Pop / Bedroom" type="button" data-i18n="genre_pop">独立流行 / 梦幻流行</button>
          <button class="pill-btn" data-genre="Ambient / Drone" type="button" data-i18n="genre_ambient">环境 / 氛围</button>
          <button class="pill-btn" data-genre="Neo-Soul / Jazz / Beats" type="button" data-i18n="genre_jazz">爵士 / 律动</button>
          <button class="pill-btn" data-genre="Avant-Garde / Noise" type="button" data-i18n="genre_noise">先锋 / 实验</button>
        </div>

        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input type="text" class="search-input" placeholder="检索唱片、音乐人、厂牌、关键词..." data-i18n-placeholder="search_placeholder">
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
            <span>📡</span> <span data-i18n="stream_title">实时电波流</span>
          </div>
          <span style="font-size: 0.7rem; color: var(--accent-cyan); font-family: var(--font-mono);">
            AUTO SYNC
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
        <div class="player-title" id="player-title" data-i18n="now_playing_none">未选择曲目</div>
        <div class="player-artist" id="player-artist" data-i18n="now_playing_hint">点击任意卡片试听</div>
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
      <!-- Dynamic Links -->
    </div>
  </footer>

  <script src="assets/js/app.js?v=${timestamp}"></script>
</body>
</html>
`;
}
