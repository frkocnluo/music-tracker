/**
 * SONIC RADAR · 前端交互
 *
 * 关键修正
 *  1. 旧版播放器 100% 是「合成器假音」——115 张卡片全部没有音源（data-preview 恒为空），
 *     点击试听只会用 Web Audio 播一个三角波。现在改为：
 *        · 有真实音源（YouTube 视频 / RSS 音频 enclosure）→ 真的播放；
 *        · 没有音源 → 明确告知并引导至平台直链，不再伪装成播放成功。
 *  2. 外链改为由 data-q 在前端展开，避免同一批长 URL 在 HTML 里重复存储。
 *  3. 动态注入的外链补齐 rel="noopener noreferrer"。
 *  4. 筛选维度改为真实数据（fresh / consensus / editorial + 动态流派），
 *     并显示「无匹配结果」提示；旧版筛不到任何卡片时页面会变成一片空白且无反馈。
 */

const I18N = {
  zh: {
    brand_tag: '全球雷达',
    brand_subtitle: '全球先锋实验、地下独立与多平台共识雷达',
    live_feed: '实时新声 {n} 条',
    sync_label: '数据快照',
    hero_title: '摆脱算法规训，重返一手声音。',
    hero_desc: '直连全球先锋实验、地下独立与权威乐评共识，在算法发现它们之前先一步听到。',
    stat_fresh: '实时新声',
    stat_consensus: '多源共识',
    stat_playable: '可直接试听',
    stat_channels: '信源在线',
    tab_all: '全部条目',
    tab_avantgarde: '先锋与实验',
    tab_underground: 'Bandcamp 深度发掘',
    tab_critical: '权威乐评',
    status_all: '全部条目',
    status_fresh: '实时新声（45 天内）',
    status_consensus: '多源共识',
    status_editorial: '专栏 / 专访 / 播客',
    editorial_note: '深度专栏（不计单一专辑评分）',
    no_excerpt: '该信源未随订阅推送摘要，点击标题前往原文。',
    genre_all: '全部流派',
    search_placeholder: '检索唱片、音乐人、厂牌、关键词...',
    stream_title: '实时电波流',
    stream_sub: '近 45 天',
    health_title: '信源健康度',
    degrade_title: '部分信源暂时不可用',
    btn_preview: '试听 Preview',
    now_playing_none: '未选择曲目',
    now_playing_hint: '点击任意卡片试听',
    no_result: '没有符合条件的条目，试试放宽筛选条件。',
    no_audio: '该信源未提供免费试听音源',
    no_audio_hint: '已为你准备好平台直链，点击下方任一平台继续收听。',
    open_platform: '前往平台收听',
    close_player: '关闭播放器'
  },
  en: {
    brand_tag: 'GLOBAL RADAR',
    brand_subtitle: 'Global Avant-Garde, Underground & Critical Consensus Radar',
    live_feed: '{n} fresh releases',
    sync_label: 'Snapshot',
    hero_title: 'Escape algorithmic feeds. Dig directly from the source.',
    hero_desc: 'Wired straight to global avant-garde, underground and critical consensus — hear it before the algorithm catches up.',
    stat_fresh: 'Fresh Drops',
    stat_consensus: 'Cross-Source',
    stat_playable: 'Playable Now',
    stat_channels: 'Sources Online',
    tab_all: 'All Entries',
    tab_avantgarde: 'Avant-Garde',
    tab_underground: 'Bandcamp Daily',
    tab_critical: 'Critical',
    status_all: 'All Entries',
    status_fresh: 'Fresh (< 45 days)',
    status_consensus: 'Cross-Source Consensus',
    status_editorial: 'Features & Interviews',
    editorial_note: 'Editorial feature (no single-album score)',
    no_excerpt: 'This source ships no excerpt with its feed — open the original to read on.',
    genre_all: 'All Genres',
    search_placeholder: 'Search albums, artists, labels, keywords...',
    stream_title: 'Live Feed Stream',
    stream_sub: 'Last 45 days',
    health_title: 'Source Health',
    degrade_title: 'Some sources are temporarily unavailable',
    btn_preview: 'Preview',
    now_playing_none: 'No track selected',
    now_playing_hint: 'Click Preview on any entry',
    no_result: 'Nothing matches these filters. Try widening them.',
    no_audio: 'No free preview audio from this source',
    no_audio_hint: 'Platform links are ready below — pick one to keep listening.',
    open_platform: 'Open on platform',
    close_player: 'Close player'
  }
};

const PLATFORM_TEMPLATES = {
  douban: (q) => `https://music.douban.com/subject_search?search_text=${q}`,
  bandcamp: (q) => `https://bandcamp.com/search?q=${q}`,
  spotify: (q) => `https://open.spotify.com/search/${q}`,
  youtube: (q) => `https://www.youtube.com/results?search_query=${q}`
};

document.addEventListener('DOMContentLoaded', () => {
  let currentCategory = 'all';
  let currentGenre = 'all';
  let currentStatus = 'all';
  let searchQuery = '';
  let currentLang = localStorage.getItem('sonic_radar_lang') || 'zh';

  const cards = Array.from(document.querySelectorAll('.release-card'));
  const tabBtns = document.querySelectorAll('.tab-btn');
  const statusBtns = document.querySelectorAll('.status-pill-btn');
  const pillBtns = document.querySelectorAll('.pill-btn');
  const searchInput = document.querySelector('.search-input');
  const langToggleBtn = document.getElementById('lang-toggle-btn');
  const grid = document.getElementById('release-grid');

  const playerDock = document.getElementById('player-dock');
  const playerThumb = document.getElementById('player-thumb');
  const playerTitle = document.getElementById('player-title');
  const playerArtist = document.getElementById('player-artist');
  const playToggleBtn = document.getElementById('play-toggle-btn');
  const playerLinks = document.getElementById('player-links');
  const playerStage = document.getElementById('player-stage');
  const waveform = document.getElementById('waveform');

  const dict = () => I18N[currentLang] || I18N.zh;

  // 注意：必须在任何 filterCards() 调用之前声明。
  // applyLanguage() 在初始化阶段就会触发 filterCards()，
  // 若把 let 声明放在后面会命中 TDZ（Cannot access before initialization），
  // 导致整个 DOMContentLoaded 回调中断 —— 所有筛选与播放器事件都绑不上。
  let noResultEl = null;
  function ensureNoResultEl() {
    if (!noResultEl && grid) {
      noResultEl = document.createElement('div');
      noResultEl.className = 'no-result';
      noResultEl.hidden = true;
      grid.after(noResultEl);
    }
    return noResultEl;
  }

  /* ---------------- 1. 外链展开（替代 HTML 里重复存储的长 URL） ---------------- */

  for (const card of cards) {
    const q = card.dataset.q || '';
    if (!q) continue;
    const encoded = encodeURIComponent(q);
    for (const a of card.querySelectorAll('.platform-links .ext-link, .platform-links .douban-link')) {
      const platform = a.dataset.platform;
      const tpl = PLATFORM_TEMPLATES[platform];
      if (tpl) a.href = tpl(encoded);
      else if (platform === 'original' && card.dataset.orig) a.href = card.dataset.orig;
    }
  }

  /* ---------------- 2. 语言切换 ---------------- */

  // 预建小写检索索引：属性值保留原始大小写便于阅读，
  // 但检索必须不区分大小写 —— 否则输入 "pitchfork" 匹配不到 "Pitchfork Reviews"。
  // 摘要正文不写进 HTML 属性（省体积），而是在这里从 DOM 里取，实现全文检索。
  const searchIndex = new Map();
  for (const card of cards) {
    const excerpt = card.querySelector('.card-summary')?.textContent || '';
    searchIndex.set(card, `${card.dataset.search || ''} ${excerpt}`.toLowerCase());
  }
  function applyLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('sonic_radar_lang', lang);
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    const d = I18N[lang] || I18N.zh;

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.dataset.i18n;
      if (!d[key]) return;
      el.textContent = key === 'live_feed' ? d[key].replace('{n}', el.dataset.i18nCount || '') : d[key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.dataset.i18nPlaceholder;
      if (d[key]) el.placeholder = d[key];
    });
    if (langToggleBtn) {
      langToggleBtn.querySelectorAll('.lang-text').forEach((t) => t.classList.toggle('active', t.classList.contains(lang)));
    }
    if (searchInput) filterCards();
  }

  if (langToggleBtn) {
    langToggleBtn.addEventListener('click', () => applyLanguage(currentLang === 'zh' ? 'en' : 'zh'));
  }
  applyLanguage(currentLang);

  /* ---------------- 3. 筛选 ---------------- */

  function filterCards() {
    let visible = 0;

    for (const card of cards) {
      const matchCategory = currentCategory === 'all' || card.dataset.cat === currentCategory;
      // data-genres 为以 | 分隔的小写流派串，精确匹配避免旧版 includes 的子串误命中
      const genres = (card.dataset.genres || '').split('|').filter(Boolean);
      const matchGenre = currentGenre === 'all' || genres.includes(currentGenre);
      const matchSearch = !searchQuery || (searchIndex.get(card) || '').includes(searchQuery);
      const isFresh = card.dataset.fresh === '1';
      const srcCount = Number(card.dataset.srcCount || 1);
      const isRelease = card.dataset.type === 'release';

      let matchStatus = true;
      if (currentStatus === 'fresh') matchStatus = isFresh;
      else if (currentStatus === 'consensus') matchStatus = srcCount > 1;
      else if (currentStatus === 'editorial') matchStatus = !isRelease;

      const ok = matchCategory && matchGenre && matchSearch && matchStatus;
      card.hidden = !ok;
      if (ok) visible++;
    }

    const el = ensureNoResultEl();
    if (el) {
      el.textContent = visible === 0 ? dict().no_result : '';
      el.hidden = visible !== 0;
    }
  }

  tabBtns.forEach((btn) => btn.addEventListener('click', () => {
    tabBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentCategory = btn.dataset.category;
    filterCards();
  }));

  statusBtns.forEach((btn) => btn.addEventListener('click', () => {
    statusBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentStatus = btn.dataset.status;
    filterCards();
  }));

  pillBtns.forEach((btn) => btn.addEventListener('click', () => {
    pillBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentGenre = btn.dataset.genre;
    filterCards();
  }));

  if (searchInput) {
    let timer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        searchQuery = e.target.value.trim().toLowerCase();
        filterCards();
      }, 150);
    });
  }

  /* ---------------- 4. 播放器（真实音源优先，无音源如实告知） ---------------- */

  const audioEl = new Audio();
  audioEl.preload = 'none';
  let mode = 'none'; // 'embed' | 'audio' | 'none'
  let currentEmbed = '';

  function setPlaying(on) {
    if (waveform) waveform.classList.toggle('playing', on);
    if (playerThumb) playerThumb.classList.toggle('playing', on);
    if (playToggleBtn) playToggleBtn.textContent = on ? '❚❚' : '▶';
  }

  function clearStage() {
    audioEl.pause();
    try { audioEl.currentTime = 0; } catch { /* ignore */ }
    audioEl.removeAttribute('src');
    if (playerStage) playerStage.innerHTML = '';
    setPlaying(false);
  }

  function renderOutbound(links, q) {
    if (!playerLinks) return;
    playerLinks.innerHTML = '';
    const add = (href, text) => {
      const a = document.createElement('a');
      a.href = href;
      a.target = '_blank';
      a.rel = 'noopener noreferrer'; // 旧版动态外链缺失该属性
      a.className = 'player-outbound-link';
      a.textContent = text;
      playerLinks.appendChild(a);
    };
    if (links.original) add(links.original, 'Original ↗');
    const encoded = encodeURIComponent(q || '');
    if (!q) return;
    add(PLATFORM_TEMPLATES.bandcamp(encoded), 'Bandcamp ↗');
    add(PLATFORM_TEMPLATES.spotify(encoded), 'Spotify ↗');
    add(PLATFORM_TEMPLATES.youtube(encoded), 'YouTube ↗');
    add(PLATFORM_TEMPLATES.douban(encoded), '豆瓣 ↗');
  }

  function mountEmbed() {
    if (!playerStage || !currentEmbed) return;
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/${encodeURIComponent(currentEmbed)}?autoplay=1&rel=0`;
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.loading = 'lazy';
    iframe.title = playerTitle.textContent || 'YouTube embed';
    playerStage.innerHTML = '';
    playerStage.appendChild(iframe);
    setPlaying(true);
  }

  function openCard(card) {
    const title = card.querySelector('.card-title')?.textContent || '';
    const artist = card.querySelector('.card-artist')?.textContent || '';
    const q = card.dataset.q || '';
    const embed = card.dataset.embed || '';
    const audio = card.dataset.audio || '';
    const cover = card.querySelector('.sleeve-cover-img')?.getAttribute('src') || '';

    playerTitle.textContent = title;
    playerArtist.textContent = artist || card.querySelector('.card-meta-line span:last-child')?.textContent || '';
    playerDock.hidden = false;

    const vinylCenter = playerThumb?.querySelector('.player-vinyl-center');
    if (vinylCenter) {
      if (cover) {
        vinylCenter.style.backgroundImage = `url('${cover}')`;
        vinylCenter.style.backgroundSize = 'cover';
        vinylCenter.style.backgroundPosition = 'center';
      } else {
        vinylCenter.style.backgroundImage = 'none';
      }
    }

    renderOutbound({ original: card.dataset.orig || '' }, q);
    clearStage();

    if (embed) {
      // 真实音源 1：YouTube 视频内嵌（Fantano 源，可真正播放）
      mode = 'embed';
      currentEmbed = embed;
      playToggleBtn.hidden = false;
      mountEmbed();
      return;
    }

    if (audio) {
      // 真实音源 2：RSS 音频 enclosure
      mode = 'audio';
      playToggleBtn.hidden = false;
      audioEl.src = audio;
      audioEl.play().then(() => setPlaying(true)).catch(() => {
        setPlaying(false);
        playerArtist.textContent = dict().no_audio;
      });
      return;
    }

    // 无免费音源：不再用合成器假音伪装播放，如实告知并引导到平台
    mode = 'none';
    currentEmbed = '';
    playToggleBtn.hidden = true;
    playerArtist.textContent = dict().no_audio;
    playerStage.innerHTML =
      `<div class="player-note"><strong>${dict().no_audio}</strong><span>${dict().no_audio_hint}</span></div>`;
    setPlaying(false);
  }

  document.querySelectorAll('.play-preview-btn, .cover-sleeve').forEach((el) => {
    el.addEventListener('click', () => {
      const card = el.closest('.release-card');
      if (card) openCard(card);
    });
  });

  audioEl.addEventListener('ended', () => setPlaying(false));
  audioEl.addEventListener('pause', () => { if (mode === 'audio') setPlaying(false); });
  audioEl.addEventListener('play', () => { if (mode === 'audio') setPlaying(true); });

  if (playToggleBtn) {
    playToggleBtn.addEventListener('click', () => {
      if (mode === 'audio') {
        if (audioEl.paused) audioEl.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
        else { audioEl.pause(); setPlaying(false); }
      } else if (mode === 'embed') {
        // 内嵌 iframe 无法直接暂停，用卸载/重挂载实现「停/播」
        if (playerStage && playerStage.querySelector('iframe')) {
          playerStage.innerHTML = '';
          setPlaying(false);
        } else {
          mountEmbed();
        }
      }
    });
  }

  console.log(`⚡ Sonic Radar 初始化完成：${cards.length} 条实体 · 语言 ${currentLang}`);
});
