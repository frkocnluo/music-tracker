/**
 * HTML 模板与页面布局生成器
 *
 * 本版修复/优化
 *  1. 全量 HTML 转义（标题/摘要/信源名来自第三方订阅，属不可信输入；
 *     旧版只替换了双引号，摘要直接内插到文本节点，存在注入面）。
 *  2. 产物体积瘦身：同一批搜索 URL 旧版在 data-links 与平台链接里各存一遍，
 *     封面 URL 存 3 份。现改为「一个 data-q + 基础 href，前端展开」，
 *     封面只出现 2 处（img.src + CSS 变量 --cover）。
 *  3. 流派 pill 由真实数据动态生成 —— 旧版固定 6 个 pill，
 *     而 66% 的条目落在「Alternative / Digging」桶里，任何 pill 都筛不到。
 *  4. 移除无效 UI：RYM / AOTY 在 97% 的卡片上恒为「-」，Best New Music 高亮
 *     因订阅源不含该标记而永不触发。改为展示可核验的「多源共识」与信源健康度。
 *  5. 信源健康度面板：明确标出失效/降级信源，不再把上周的旧快照伪装成「实时」。
 */

/* ------------------------------------------------------------------ *
 * 转义
 * ------------------------------------------------------------------ */

export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 用于 data-* 与 href：与 esc 相同，额外把换行压平 */
const escAttr = (v) => esc(String(v ?? '').replace(/\s+/g, ' ').trim());

/* ------------------------------------------------------------------ *
 * 页面
 * ------------------------------------------------------------------ */

export function renderPage({ entries, cache, sources }) {
  const getInitials = (str) => {
    const s = String(str || '').trim();
    if (!s) return 'SR';
    const words = s.split(/\s+/);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  };

  const sourceStatus = new Map((cache.sources || []).map((s) => [s.sourceId, s]));
  const releases = entries.filter((e) => e.itemType === 'release');
  const editorial = entries.filter((e) => e.itemType !== 'release');
  const freshEntries = entries.filter((e) => e.isFresh);
  const consensusEntries = entries.filter((e) => e.sourceCount > 1);
  const playable = entries.filter((e) => e.embedId || e.audioSrc);

  /* ---------------- 卡片 ---------------- */

  const cardsHtml = entries.map((entry) => {
    const initials = getInitials(entry.artist || entry.title);
    const bgStyle = entry.coverGradient || 'linear-gradient(135deg, #1f1c2c 0%, #928dab 100%)';
    const q = escAttr(`${entry.artist} ${entry.title}`.trim());
    const searchString = escAttr(
      [entry.title, entry.artist, entry.label, (entry.genres || []).join(' ')].filter(Boolean).join(' ')
    );
    const cover = entry.coverArt && entry.sourceOk !== false ? escAttr(entry.coverArt) : '';

    const badgesHtml = (entry.sources || [])
      .map((s) => {
        const cls = String(s.sourceId || s.source || '').toLowerCase().replace(/[^a-z]/g, '');
        const label = esc(`${s.source} · ${s.badge}`);
        return `<span class="source-badge ${cls}" title="${escAttr(s.note || '')}">${label}</span>`;
      })
      .join('');

    const genresHtml = (entry.genres || [])
      .map((g) => `<span class="genre-tag">${esc(g)}</span>`)
      .join('');

    const linksHtml = [
      ['original', 'Original ↗', entry.links?.original || '#', ''],
      ['douban', '豆瓣 ↗', 'https://music.douban.com/subject_search', ' douban-link'],
      ['bandcamp', 'Bandcamp ↗', 'https://bandcamp.com/search', ''],
      ['spotify', 'Spotify ↗', 'https://open.spotify.com/search', ''],
      ['youtube', 'YouTube ↗', 'https://www.youtube.com/results', '']
    ]
      .map(([, text, href, cls]) =>
        `<a href="${escAttr(href)}" data-platform="${cls.includes('douban') ? 'douban' : text.split(' ')[0].toLowerCase()}" target="_blank" rel="noopener noreferrer" class="ext-link${cls}">${text}</a>`
      )
      .join('');

    /* 评分区：只展示可核验的平台 */
    let scoresHtml;
    if (entry.itemType !== 'release' || !entry.scores) {
      scoresHtml = `<div class="editorial-badge-bar"><span class="editorial-type-pill ${escAttr(entry.itemType)}">${esc(entry.itemTypeLabel || 'FEATURE')}</span><span class="editorial-note" title="${escAttr(entry.itemTypeNote || '')}">${esc(entry.itemTypeNote || '深度专栏（不计单一专辑评分）')}</span></div>`;
    } else {
      const s = entry.scores;
      const p4k = s.pitchfork || {};
      const tnd = s.fantano || {};
      const db = s.douban || {};
      // 只渲染已有评分的平台；全部未评时整行不出现（实测 94 张唱片里 63/84/91 个评分位是空的）
      const rated = (x) => x.status && x.status !== 'unrated';
      const pills = [
        rated(p4k) &&
          `<span class="score-pill pitchfork ${escAttr(p4k.status)}" title="Pitchfork: ${escAttr(p4k.label || '')}">` +
          `<span class="score-label">P4K</span><span class="score-val">${esc(p4k.label || '—')}</span>` +
          (p4k.bnm ? '<span class="score-extra">BNM</span>' : '') +
          `</span>`,
        rated(tnd) &&
          `<span class="score-pill fantano ${escAttr(tnd.status)}" title="The Needle Drop: ${escAttr(tnd.label || '')}">` +
          `<span class="score-label">TND</span><span class="score-val">${esc(tnd.label || '—')}</span></span>`,
        rated(db) &&
          `<a href="${escAttr(entry.links?.original || '#')}" target="_blank" rel="noopener noreferrer" class="score-pill douban ${escAttr(db.status)}" title="${escAttr(db.tooltip || '')}">` +
          `<span class="score-label">豆瓣</span><span class="score-val">${esc(db.label || '')}</span></a>`
      ].filter(Boolean);
      scoresHtml = pills.length
        ? `<div class="scores-bar" title="已核验的平台评分 · 未接入的平台不展示虚假数值">${pills.join('')}</div>`
        : '';
    }

    // 无摘要就不占位：34 张卡原先各多出一行「未推送摘要」的斜体说明
    const summaryHtml = entry.summary ? `<p class="card-summary">${esc(entry.summary)}</p>` : '';

    const metaLine = [
      `<span class="live-date-pill">${esc(entry.releaseDate || 'DATE N/A')}</span>`,
      `<span>${esc(entry.label || 'Editorial Pick')}</span>`
    ].join('');

    const artistHtml = entry.artist
      ? `<div class="card-artist${entry.artistConfidence === 'unknown' || entry.artistConfidence === 'guessed' ? ' low-confidence' : ''}"${entry.artistConfidence === 'guessed' ? ' title="艺人名由标题推断，可能不准确"' : ''}>${esc(entry.artist)}</div>`
      : '';

    const playable = Boolean(entry.embedId || entry.audioSrc);

    return (
      `<article class="release-card${entry.sourceCount > 1 ? ' highlight' : ''}" ` +
      `data-cat="${escAttr(entry.category)}" data-type="${escAttr(entry.itemType)}" ` +
      `data-genres="${escAttr((entry.genres || []).join('|').toLowerCase())}" ` +
      `data-db="${escAttr(entry.scores?.douban?.status || 'none')}" ` +
      `data-fresh="${entry.isFresh ? 1 : 0}" data-src-count="${entry.sourceCount || 1}" ` +
      `data-orig="${escAttr(entry.links?.original || '')}" data-q="${q}" ` +
      `data-embed="${escAttr(entry.embedId || '')}" data-audio="${escAttr(entry.audioSrc || '')}" ` +
      `data-search="${searchString}">` +
      `<div class="card-top">` +
      `<div class="cover-sleeve"${playable ? ` role="button" tabindex="0" aria-label="试听 ${escAttr(entry.title)}"` : ''}${cover ? ` style="--cover:url('${cover}')"` : ''}>` +
      `<div class="sleeve-jacket" style="background:${escAttr(bgStyle)};">` +
      (cover
        ? `<img src="${cover}" alt="${escAttr(entry.title)}" class="sleeve-cover-img" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">`
        : '') +
      `<span class="sleeve-initials">${esc(initials)}</span>` +
      `</div>` +
      `<div class="vinyl-disc"><div class="vinyl-center-label"></div></div>` +
      `</div>` +
      `<div class="card-info">` +
      `<h3 class="card-title" title="${escAttr(entry.title)}">${esc(entry.title)}</h3>` +
      artistHtml +
      `<div class="card-meta-line">${metaLine}</div>` +
      `</div></div>` +
      `<div class="source-badges">${badgesHtml}</div>` +
      scoresHtml +
      summaryHtml +
      (genresHtml ? `<div class="genre-tags">${genresHtml}</div>` : '') +
      `<div class="card-actions">` +
      // 没有真实音源的卡片不放试听键：点了也只会得到一句「无音源」，平台直链已在右侧
      (playable
        ? `<button class="play-preview-btn" type="button"><span>▶</span> <span data-i18n="btn_preview">试听 Preview</span></button>`
        : '') +
      `<div class="platform-links">${linksHtml}</div>` +
      `</div>` +
      `</article>`
    );
  }).join('\n');

  /* ---------------- 实时电波流（仅新鲜条目） ---------------- */

  const streamSource = freshEntries.length ? freshEntries : entries;
  const streamItemsHtml = streamSource
    .slice(0, 20)
    .map((item) => {
      const st = sourceStatus.get(item.primarySourceId);
      return (
        `<div class="stream-item">` +
        `<div class="stream-item-top">` +
        `<span class="stream-source-tag">${esc(st?.badge || item.label)}</span>` +
        `<span class="stream-date">${esc(item.releaseDate || '')}</span>` +
        `</div>` +
        `<a href="${escAttr(item.links?.original || '#')}" target="_blank" rel="noopener noreferrer" class="stream-link">${esc(item.title)}</a>` +
        `</div>`
      );
    })
    .join('\n');

  /* ---------------- 动态流派 pill ---------------- */

  const genreCount = {};
  for (const e of releases) for (const g of e.genres || []) genreCount[g] = (genreCount[g] || 0) + 1;
  const genrePills = [
    [`<button class="pill-btn active" data-genre="all" type="button" data-i18n="genre_all">全部流派</button>`],
    Object.entries(genreCount)
      .sort((a, b) => b[1] - a[1])
      .map(([g, n]) => `<button class="pill-btn" data-genre="${escAttr(g.toLowerCase())}" type="button">${esc(g)} <span class="pill-count">${n}</span></button>`)
  ].flat().join('');

  /* ---------------- 信源健康度 ---------------- */

  const liveSources = (cache.sources || []).filter((s) => s.ok !== null);
  const okSources = liveSources.filter((s) => s.ok === true);
  const sourceRows = (cache.sources || [])
    .map((s) => {
      const state = s.ok === true ? 'ok' : s.ok === null ? 'curated' : 'degraded';
      const detail =
        s.ok === true
          ? `${s.items.length} 条 · ${s.ms ? s.ms + 'ms' : ''}`
          : s.status === 'curated'
            ? '无公开订阅接口'
            : `${s.httpStatus ? 'HTTP ' + s.httpStatus : '连接失败'} · 沿用 ${s.items.length} 条旧快照`;
      return (
        `<div class="health-row" data-state="${state}">` +
        `<span class="health-dot"></span>` +
        `<span class="health-name">${esc(s.sourceName)}</span>` +
        `<span class="health-detail">${esc(detail)}</span>` +
        `</div>`
      );
    })
    .join('');

  const syncAge = cache.meta?.updatedAt
    ? Math.max(0, Math.round((Date.now() - new Date(cache.meta.updatedAt).getTime()) / 3600000))
    : null;
  const degraded = (cache.sources || []).filter((s) => s.ok === false);

  const timestamp = Date.now();
  // 跑马灯内容重复 12 次（两份等长副本），CSS 位移 -50% 即无缝循环
  const marqueeSpans = '<span>SONIC RADAR · 全球音乐雷达 · </span>'.repeat(12);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SONIC RADAR · 全球音乐挖掘雷达</title>
<meta name="description" content="直连 Pitchfork、Bandcamp Daily、The Quietus、Stereogum、The Wire 与 The Needle Drop 的一手发行与乐评共识雷达。">
<meta property="og:type" content="website">
<meta property="og:title" content="SONIC RADAR · Global Music Radar">
<meta property="og:description" content="摆脱算法规训，直连全球先锋实验、地下独立与权威乐评共识。">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f8f8f8'/%3E%3Ccircle cx='50' cy='50' r='30' fill='none' stroke='%23100f0f' stroke-width='8'/%3E%3Ccircle cx='50' cy='50' r='7' fill='%23100f0f'/%3E%3C/svg%3E">
<link rel="stylesheet" href="assets/css/style.css?v=${timestamp}">
</head>
<body>

<header class="site-header">
  <div class="header-container">
    <div class="brand-wrapper">
      <div class="brand-logo-disc"></div>
      <div>
        <div class="brand-title">SONIC RADAR <span class="brand-tag" data-i18n="brand_tag">全球雷达</span></div>
        <div class="brand-subtitle" data-i18n="brand_subtitle">全球先锋实验、地下独立与多平台共识雷达</div>
      </div>
    </div>
    <div class="sources-ticker">
      <span class="pulse-dot"></span>
      <span id="live-indicator" data-i18n="live_feed" data-i18n-count="${freshEntries.length}">实时新声 ${freshEntries.length} 条 / 档案 ${entries.length} 条</span>
    </div>
    <div class="header-actions">
      <button id="lang-toggle-btn" type="button" class="lang-toggle-btn" title="切换语言 / Switch Language">
        <span class="lang-text zh">中文</span><span class="lang-divider">/</span><span class="lang-text en">EN</span>
      </button>
      <span class="sync-stamp" title="站点为静态快照，由 CI 每 12 小时重新抓取并发布；浏览器端无法直接跨域拉取订阅源">
        <span data-i18n="sync_label">数据快照</span> ${esc(cache.meta?.updatedAt ? cache.meta.updatedAt.replace('T', ' ').slice(0, 16) : '—')}
        ${syncAge !== null ? `<span class="muted">(${syncAge}h 前)</span>` : ''}
      </span>
      <a href="https://github.com/frkocnluo/music-tracker/actions" target="_blank" rel="noopener noreferrer" class="github-badge-link">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
        CI 同步记录
      </a>
    </div>
  </div>
</header>

<main class="main-container">

  ${degraded.length ? `<div class="degrade-banner" role="status">
    <strong data-i18n="degrade_title">部分信源暂时不可用</strong>
    <span>${degraded.map((s) => `${esc(s.sourceName)}（${esc(s.error || '抓取失败')}，展示 ${esc(s.lastOkAt || '历史')} 的快照）`).join('　')}</span>
  </div>` : ''}

  <section class="page-intro">
    <h1 class="page-title">sonic radar</h1>
    <p class="page-tagline" data-i18n="page_tagline">先锋实验与乐评共识雷达</p>
    <span class="page-meta">${entries.length} 条 · ${okSources.length} 信源</span>
  </section>

  <section class="control-panel">
    <div class="filter-primary">
      <button class="tab-btn active" data-category="all" type="button"><span data-i18n="tab_all">全部</span></button>
      <button class="tab-btn" data-category="avant-garde" type="button"><span data-i18n="tab_avantgarde">先锋</span></button>
      <button class="tab-btn" data-category="underground" type="button"><span data-i18n="tab_underground">地下</span></button>
      <button class="tab-btn" data-category="critical" type="button"><span data-i18n="tab_critical">乐评</span></button>
      <span class="filter-sep"></span>
      <button class="status-pill-btn active" data-status="all" type="button"><span data-i18n="status_all">全部</span></button>
      <button class="status-pill-btn" data-status="fresh" type="button"><span data-i18n="status_fresh">新声</span></button>
      <button class="status-pill-btn" data-status="consensus" type="button"><span data-i18n="status_consensus">共识</span></button>
      <button class="status-pill-btn" data-status="playable" type="button"><span data-i18n="status_playable">可听</span></button>
      <button class="status-pill-btn" data-status="editorial" type="button"><span data-i18n="status_editorial">专栏</span></button>
    </div>

    <div class="filter-secondary">
      <div class="genre-pills">${genrePills}</div>
      <div class="search-box">
        <input type="text" class="search-input" aria-label="search" placeholder="检索..." data-i18n-placeholder="search_placeholder">
        <div class="search-box-meta">
          <span id="result-count"></span>
          <button type="button" id="clear-filters" class="clear-filters" data-i18n="clear_filters" hidden>清除</button>
        </div>
      </div>
    </div>
  </section>

  <div class="layout-columns">
    <section class="release-grid" id="release-grid">
${cardsHtml}
    </section>

    <aside class="live-stream-panel">
      <div class="stream-header">
        <div class="stream-title"><span data-i18n="stream_title">实时电波流</span></div>
        <span class="stream-sub" data-i18n="stream_sub">近 45 天</span>
      </div>
      <div class="stream-list">
${streamItemsHtml}
      </div>

      <div class="stream-header">
        <div class="stream-title"><span data-i18n="health_title">信源健康度</span></div>
        <span class="stream-sub">${okSources.length}/${liveSources.length} OK</span>
      </div>
      <div class="source-health">
${sourceRows}
      </div>
    </aside>
  </div>

</main>

<footer class="player-dock" id="player-dock" hidden>
  <div class="player-now-playing">
    <div class="player-vinyl-thumb" id="player-thumb"><div class="player-vinyl-center"></div></div>
    <div class="player-text">
      <div class="player-title" id="player-title" data-i18n="now_playing_none">未选择曲目</div>
      <div class="player-artist" id="player-artist" data-i18n="now_playing_hint">点击任意卡片试听</div>
    </div>
  </div>
  <div class="player-controls">
    <button class="dock-btn" id="play-toggle-btn" type="button" title="播放/暂停">▶</button>
    <div class="waveform-bars" id="waveform">
      <div class="wave-bar"></div><div class="wave-bar"></div><div class="wave-bar"></div>
      <div class="wave-bar"></div><div class="wave-bar"></div><div class="wave-bar"></div>
    </div>
  </div>
  <div class="player-stage" id="player-stage"></div>
  <div class="player-outbound" id="player-links"></div>
</footer>

<script src="assets/js/app.js?v=${timestamp}"></script>
</body>
</html>
`;
}
