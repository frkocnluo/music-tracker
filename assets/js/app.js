/**
 * SONIC RADAR · CLIENT APP LOGIC
 * Features:
 * - Bilingual i18n Switcher (EN / 中文) with localStorage memory
 * - Category Tab Filtering (All / Avant-Garde / Underground / Critical)
 * - Genre Filter Pills & Debounced Search
 * - Inline Universal Player with dynamic vinyl artwork and Web Audio fallback
 * - Force cache refresh mechanism
 */

const I18N = {
  zh: {
    brand_tag: "全球雷达",
    brand_subtitle: "全球先锋实验、地下独立与多平台评分实时看板",
    live_feed: "实时在线: {n} 张发行",
    sync_btn: "⚡ 刷新实时流",
    syncing_btn: "⚡ 同步中...",
    hero_title: "摆脱算法规训，重返一手声音。",
    hero_desc: "实时追踪 Pitchfork、Bandcamp Daily、The Quietus、Stereogum 与 The Needle Drop 的一手挖掘信源，连接全球先锋实验与地下独立新声。",
    stat_releases: "追踪条目",
    stat_douban_rated: "经典已评",
    stat_douban_digging: "前沿新声",
    stat_channels: "直连信源",
    tab_all: "全部发行",
    tab_avantgarde: "先锋与实验 (The Quietus / The Wire)",
    tab_underground: "Bandcamp 深度发掘",
    tab_critical: "权威乐评 (Pitchfork / Stereogum / Fantano)",
    status_all: "全部条目",
    status_douban_unrated: "⚡ 挖掘前线 (豆瓣暂无分)",
    status_douban_verified: "🟢 经典重发 (已有评分)",
    status_editorial: "📰 深度专栏 / 专访",
    editorial_note: "深度音乐专栏（不计单一专辑评分）",
    genre_all: "全部流派",
    genre_club: "Club / 电子",
    genre_rock: "后朋 / 摇滚",
    genre_pop: "独立流行 / 梦幻流行",
    genre_ambient: "环境 / 氛围",
    genre_jazz: "爵士 / 律动",
    genre_noise: "先锋 / 实验",
    search_placeholder: "检索唱片、音乐人、厂牌、关键词...",
    stream_title: "实时电波流",
    btn_preview: "试听 Preview",
    now_playing_none: "未选择曲目",
    now_playing_hint: "点击任意卡片试听"
  },
  en: {
    brand_tag: "GLOBAL RADAR",
    brand_subtitle: "Global Avant-Garde, Underground & Critical Release Radar",
    live_feed: "LIVE FEED: {n} RELEASES ONLINE",
    sync_btn: "⚡ Sync Feeds",
    syncing_btn: "⚡ Syncing...",
    hero_title: "Escape algorithmic feeds. Dig directly from the source.",
    hero_desc: "Real-time syndicated music discovery tracking Pitchfork, Bandcamp Daily, The Quietus, Stereogum, and Anthony Fantano — discovering bold sounds before the algorithm catches up.",
    stat_releases: "Tracked Drops",
    stat_douban_rated: "Catalog Rated",
    stat_douban_digging: "Frontline",
    stat_channels: "Live Channels",
    tab_all: "All Drops",
    tab_avantgarde: "Avant-Garde & Experimental (The Quietus / The Wire)",
    tab_underground: "Bandcamp Daily Drops",
    tab_critical: "Critical Radar (Pitchfork / Stereogum / Fantano)",
    status_all: "All Entries",
    status_douban_unrated: "⚡ Digging Front (Unrated)",
    status_douban_verified: "🟢 Catalog Reissues (Rated)",
    status_editorial: "📰 Essays & Interviews",
    editorial_note: "Editorial Feature (Unrated)",
    genre_all: "All Genres",
    genre_club: "Club / Electronic",
    genre_rock: "Post-Punk / Rock",
    genre_pop: "Indie Pop / Dream Pop",
    genre_ambient: "Ambient / Drone",
    genre_jazz: "Jazz / Beats",
    genre_noise: "Avant-Garde / Noise",
    search_placeholder: "Search albums, artists, labels, keywords...",
    stream_title: "Live Feed Stream",
    btn_preview: "Preview",
    now_playing_none: "No track selected",
    now_playing_hint: "Click Preview on any album"
  }
};

document.addEventListener('DOMContentLoaded', () => {
  // 状态变量
  let currentCategory = 'all';
  let currentGenre = 'all';
  let currentStatus = 'all';
  let searchQuery = '';
  let currentLang = localStorage.getItem('sonic_radar_lang') || 'zh';
  
  // DOM 元素
  const cards = document.querySelectorAll('.release-card');
  const tabBtns = document.querySelectorAll('.tab-btn');
  const statusBtns = document.querySelectorAll('.status-pill-btn');
  const pillBtns = document.querySelectorAll('.pill-btn');
  const searchInput = document.querySelector('.search-input');
  const langToggleBtn = document.getElementById('lang-toggle-btn');
  const forceRefreshBtn = document.getElementById('force-refresh-btn');

  // 播放器元素
  const playerDock = document.getElementById('player-dock');
  const playerThumb = document.getElementById('player-thumb');
  const playerTitle = document.getElementById('player-title');
  const playerArtist = document.getElementById('player-artist');
  const playToggleBtn = document.getElementById('play-toggle-btn');
  const playerLinks = document.getElementById('player-links');
  
  // Web Audio 上下文与原生 Audio 元素
  let nativeAudio = new Audio();
  let isPlaying = false;
  let audioCtx = null;
  let synthOsc = null;
  let synthGain = null;

  // 1. 中英双语切换系统
  function applyLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('sonic_radar_lang', lang);
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';

    const dict = I18N[lang] || I18N.zh;

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (dict[key]) {
        if (key === 'live_feed') {
          const count = el.dataset.i18nCount || '';
          el.textContent = dict[key].replace('{n}', count);
        } else {
          el.textContent = dict[key];
        }
      }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.dataset.i18nPlaceholder;
      if (dict[key]) {
        el.placeholder = dict[key];
      }
    });

    if (langToggleBtn) {
      langToggleBtn.querySelectorAll('.lang-text').forEach(t => {
        t.classList.toggle('active', t.classList.contains(lang));
      });
    }
  }

  if (langToggleBtn) {
    langToggleBtn.addEventListener('click', () => {
      const nextLang = currentLang === 'zh' ? 'en' : 'zh';
      applyLanguage(nextLang);
    });
  }

  // 初始化语言
  applyLanguage(currentLang);

  // 2. 卡片过滤逻辑
  function filterCards() {
    let visibleCount = 0;

    cards.forEach(card => {
      const category = card.dataset.category || '';
      const genres = (card.dataset.genres || '').toLowerCase();
      const searchableText = (card.dataset.search || '').toLowerCase();
      const itemType = card.dataset.itemType || 'release';
      const doubanStatus = card.dataset.doubanStatus || 'none';

      const matchCategory = (currentCategory === 'all' || category === currentCategory);
      const matchGenre = (currentGenre === 'all' || genres.includes(currentGenre.toLowerCase()));
      const matchSearch = (!searchQuery || searchableText.includes(searchQuery));

      let matchStatus = true;
      if (currentStatus === 'douban-verified') {
        matchStatus = (doubanStatus === 'verified');
      } else if (currentStatus === 'douban-unrated') {
        matchStatus = (doubanStatus === 'unrated' && itemType === 'release');
      } else if (currentStatus === 'editorial') {
        matchStatus = (itemType !== 'release');
      }

      if (matchCategory && matchGenre && matchSearch && matchStatus) {
        card.style.display = 'flex';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });
  }

  // 3. Tab 切换 (全部 / 先锋实验 / Bandcamp / 权威乐评)
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.dataset.category;
      filterCards();
    });
  });

  // 3.1 豆瓣收录状态与条目类型过滤切换
  statusBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      statusBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentStatus = btn.dataset.status;
      filterCards();
    });
  });

  // 4. 流派 Pill 切换
  pillBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      pillBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentGenre = btn.dataset.genre;
      filterCards();
    });
  });

  // 5. 实时搜索防抖
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        searchQuery = e.target.value.trim().toLowerCase();
        filterCards();
      }, 150);
    });
  }

  // 6. Web Audio 兜底合成器
  function startSynthAmbient(freq = 220) {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      stopSynthAmbient();
      
      synthOsc = audioCtx.createOscillator();
      synthGain = audioCtx.createGain();
      
      synthOsc.type = 'triangle';
      synthOsc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      
      synthGain.gain.setValueAtTime(0.01, audioCtx.currentTime);
      synthGain.gain.exponentialRampToValueAtTime(0.12, audioCtx.currentTime + 0.8);
      
      synthOsc.connect(synthGain);
      synthGain.connect(audioCtx.destination);
      synthOsc.start();
    } catch (e) {
      console.warn('AudioContext unavailable:', e);
    }
  }

  function stopSynthAmbient() {
    if (synthGain && audioCtx) {
      try {
        synthGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.3);
        setTimeout(() => {
          if (synthOsc) {
            synthOsc.stop();
            synthOsc.disconnect();
            synthOsc = null;
          }
        }, 300);
      } catch (e) {}
    }
  }

  // 7. 播放器逻辑
  function playTrack(title, artist, audioSrc, links = {}, cover = '') {
    playerTitle.textContent = title;
    playerArtist.textContent = artist;
    playerDock.style.display = 'flex';

    const vinylCenter = playerThumb.querySelector('.player-vinyl-center');
    if (vinylCenter) {
      if (cover) {
        vinylCenter.style.backgroundImage = `url('${cover}')`;
        vinylCenter.style.backgroundSize = 'cover';
        vinylCenter.style.backgroundPosition = 'center';
      } else {
        vinylCenter.style.backgroundImage = 'none';
      }
    }

    // 更新跳转外链
    playerLinks.innerHTML = '';
    if (links.original) playerLinks.innerHTML += `<a href="${links.original}" target="_blank" class="player-outbound-link">Original ↗</a>`;
    if (links.bandcamp) playerLinks.innerHTML += `<a href="${links.bandcamp}" target="_blank" class="player-outbound-link">Bandcamp ↗</a>`;
    if (links.spotify) playerLinks.innerHTML += `<a href="${links.spotify}" target="_blank" class="player-outbound-link">Spotify ↗</a>`;
    if (links.youtube) playerLinks.innerHTML += `<a href="${links.youtube}" target="_blank" class="player-outbound-link">YouTube ↗</a>`;

    stopAudio();

    if (audioSrc && audioSrc.startsWith('http')) {
      nativeAudio.src = audioSrc;
      nativeAudio.play().then(() => {
        setPlayingState(true);
      }).catch(() => {
        startSynthAmbient(330);
        setPlayingState(true);
      });
    } else {
      startSynthAmbient(261.63);
      setPlayingState(true);
    }
  }

  function setPlayingState(playing) {
    isPlaying = playing;
    if (playing) {
      playerThumb.classList.add('playing');
      playToggleBtn.innerHTML = '❚❚';
    } else {
      playerThumb.classList.remove('playing');
      playToggleBtn.innerHTML = '▶';
    }
  }

  function stopAudio() {
    try {
      nativeAudio.pause();
      nativeAudio.currentTime = 0;
    } catch (e) {}
    stopSynthAmbient();
    setPlayingState(false);
  }

  nativeAudio.addEventListener('ended', () => {
    setPlayingState(false);
  });

  if (playToggleBtn) {
    playToggleBtn.addEventListener('click', () => {
      if (isPlaying) {
        stopAudio();
      } else {
        if (nativeAudio.src) {
          nativeAudio.play();
          setPlayingState(true);
        } else {
          startSynthAmbient(220);
          setPlayingState(true);
        }
      }
    });
  }

  // 绑定卡片上的「快速试听」按钮
  document.querySelectorAll('.play-preview-btn, .cover-sleeve').forEach(el => {
    el.addEventListener('click', (e) => {
      const card = el.closest('.release-card');
      if (!card) return;

      const title = card.dataset.title;
      const artist = card.dataset.artist;
      const preview = card.dataset.preview;
      const cover = card.dataset.cover || '';
      const links = JSON.parse(card.dataset.links || '{}');

      playTrack(title, artist, preview, links, cover);
    });
  });

  // 强制刷新实时流（绕过本地强缓存）
  if (forceRefreshBtn) {
    forceRefreshBtn.addEventListener('click', () => {
      const dict = I18N[currentLang] || I18N.zh;
      forceRefreshBtn.textContent = dict.syncing_btn;
      const cleanUrl = window.location.origin + window.location.pathname;
      window.location.href = cleanUrl + '?refresh=' + Date.now();
    });
  }

  console.log('⚡ Sonic Radar initialized with bilingual UI and consensus ratings.');
});
