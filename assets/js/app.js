/**
 * SONIC RADAR · CLIENT APP LOGIC
 * Zero external dependencies: native DOM, Audio API, live filters
 */

document.addEventListener('DOMContentLoaded', () => {
  // 状态变量
  let currentCategory = 'all';
  let currentGenre = 'all';
  let searchQuery = '';
  
  // DOM 元素
  const cards = document.querySelectorAll('.release-card');
  const tabBtns = document.querySelectorAll('.tab-btn');
  const pillBtns = document.querySelectorAll('.pill-btn');
  const searchInput = document.querySelector('.search-input');

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

  // 1. 卡片过滤逻辑
  function filterCards() {
    let visibleCount = 0;

    cards.forEach(card => {
      const category = card.dataset.category || '';
      const genres = (card.dataset.genres || '').toLowerCase();
      const searchableText = (card.dataset.search || '').toLowerCase();

      const matchCategory = (currentCategory === 'all' || category === currentCategory);
      const matchGenre = (currentGenre === 'all' || genres.includes(currentGenre.toLowerCase()));
      const matchSearch = (!searchQuery || searchableText.includes(searchQuery));

      if (matchCategory && matchGenre && matchSearch) {
        card.style.display = 'flex';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });

    const activeTab = document.querySelector(`.tab-btn[data-category="${currentCategory}"] .tab-count`);
    if (activeTab && currentCategory === 'all') {
      activeTab.textContent = visibleCount;
    }
  }

  // 2. Tab 切换
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.dataset.category;
      filterCards();
    });
  });

  // 3. 流派 Pill 切换
  pillBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      pillBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentGenre = btn.dataset.genre;
      filterCards();
    });
  });

  // 4. 实时搜索防抖
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

  // 5. Web Audio 兜底合成器 (当音频由于跨域或无直链时提供氛围试听)
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

  // 6. 播放器逻辑
  function playTrack(title, artist, audioSrc, links = {}) {
    playerTitle.textContent = title;
    playerArtist.textContent = artist;
    playerDock.style.display = 'flex';

    // 更新跳转外链
    playerLinks.innerHTML = '';
    if (links.bandcamp) playerLinks.innerHTML += `<a href="${links.bandcamp}" target="_blank" class="player-outbound-link">Bandcamp ↗</a>`;
    if (links.streetvoice) playerLinks.innerHTML += `<a href="${links.streetvoice}" target="_blank" class="player-outbound-link">StreetVoice ↗</a>`;
    if (links.spotify) playerLinks.innerHTML += `<a href="${links.spotify}" target="_blank" class="player-outbound-link">Spotify ↗</a>`;
    if (links.netease) playerLinks.innerHTML += `<a href="${links.netease}" target="_blank" class="player-outbound-link">网易云 ↗</a>`;
    if (links.original) playerLinks.innerHTML += `<a href="${links.original}" target="_blank" class="player-outbound-link">原文 ↗</a>`;

    stopAudio();

    if (audioSrc && audioSrc.startsWith('http')) {
      nativeAudio.src = audioSrc;
      nativeAudio.play().then(() => {
        setPlayingState(true);
      }).catch(() => {
        // 播放失败时平滑降级到合成微音阶
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

  // 播放/暂停按钮切换
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
      const links = JSON.parse(card.dataset.links || '{}');

      playTrack(title, artist, preview, links);
    });
  });

  // 强制刷新实时流（绕过本地强缓存）
  const forceRefreshBtn = document.getElementById('force-refresh-btn');
  if (forceRefreshBtn) {
    forceRefreshBtn.addEventListener('click', () => {
      forceRefreshBtn.textContent = '⚡ 同步中...';
      const cleanUrl = window.location.origin + window.location.pathname;
      window.location.href = cleanUrl + '?refresh=' + Date.now();
    });
  }

  console.log('⚡ Sonic Radar initialized: All channels listening.');
});
