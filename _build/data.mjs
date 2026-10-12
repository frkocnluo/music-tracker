/**
 * 挖掘雷达数据库实体 (Music Tracker Database)
 * 精选两岸三地华语独立、全球先锋实验与权威共识唱片
 */
export const SEED_ENTRIES = [
  // ================= 华语独立前线 (Sinophone Indie) =================
  {
    id: 'svbkvlt-33-33-shadow',
    title: 'Shadow Movement',
    artist: '33EMYBW',
    releaseDate: '2024-09-20',
    category: 'sinophone',
    genres: ['Deconstructed Club', 'Experimental Electronic', 'Footwork'],
    label: 'SVBKVLT (上海)',
    coverGradient: 'linear-gradient(135deg, #09203f 0%, #537895 100%)',
    coverArt: '',
    sources: [
      { source: 'SVBKVLT', badge: 'LABEL DROP', date: '2024-09-20', note: '上海先锋俱乐部首发' },
      { source: 'The Wire', badge: 'CRITICAL HIGHLIGHT', date: '2024-10-02', note: '“东亚步法声响与肢体解构的巅峰形态”' },
      { source: 'Pitchfork', badge: 'EXPERIMENTAL RADAR', date: '2024-10-08', note: 'Resident Advisor / Pitchfork 联合特写' }
    ],
    summary: '上海先锋音乐人 33EMYBW 在 SVBKVLT 推出的全新声响雕塑，融合西南少数民族泛音节奏与机械解构节拍。',
    audioPreview: 'https://cdn.freesound.org/previews/612/612610_5674468-lq.mp3',
    links: {
      bandcamp: 'https://svbkvlt.bandcamp.com',
      streetvoice: '',
      spotify: 'https://open.spotify.com/search/33EMYBW',
      netease: 'https://music.163.com/#/search/m/?s=33EMYBW',
      original: 'https://svbkvlt.bandcamp.com'
    },
    isHighlight: true
  },
  {
    id: 'streetvoice-deca-demo',
    title: '雾中行走 (Demo)',
    artist: '温室杂草 (Easy Weeds)',
    releaseDate: '2024-10-04',
    category: 'sinophone',
    genres: ['Indie Pop', 'Lo-Fi', 'Bedroom Dream'],
    label: 'StreetVoice 独立自发行',
    coverGradient: 'linear-gradient(135deg, #2b5876 0%, #4e4376 100%)',
    coverArt: '',
    sources: [
      { source: 'StreetVoice', badge: 'SONG OF THE DAY', date: '2024-10-06', note: '街声编辑推荐 · 即时榜 TOP 3' },
      { source: 'Freshmusic', badge: '季度潜力荐听', date: '2024-10-08', note: '“纯粹的卧室吉他回响，击中都市年轻人的钝感情绪”' }
    ],
    summary: '街声首发的原汁原味 Demo，未经商业录音棚打磨的松弛毛刺感，堪称华语卧室流行今年度最惊艳的一曲。',
    audioPreview: 'https://cdn.freesound.org/previews/415/415804_5121236-lq.mp3',
    links: {
      bandcamp: '',
      streetvoice: 'https://streetvoice.com',
      spotify: 'https://open.spotify.com/search/%E6%B8%A9%E5%AE%A4%E6%9D%82%E8%8D%89',
      netease: 'https://music.163.com/#/search/m/?s=%E6%B8%A9%E5%AE%A4%E6%9D%82%E8%8D%89',
      original: 'https://streetvoice.com'
    },
    isHighlight: false
  },
  {
    id: 'eating-music-neo-soul',
    title: '夜巡夜行 (Night Patrol)',
    artist: '喜辰晨 (Voision Xi) & 宜听群星',
    releaseDate: '2024-09-12',
    category: 'sinophone',
    genres: ['Neo-Soul', 'Jazz-Hop', 'City Alternative'],
    label: 'Eating Music 宜听音乐 (上海)',
    coverGradient: 'linear-gradient(135deg, #f12711 0%, #f5af19 100%)',
    coverArt: '',
    sources: [
      { source: 'Eating Music', badge: 'BANDCAMP DROP', date: '2024-09-12', note: '限量彩胶与数位首发' },
      { source: 'Freshmusic', badge: 'FMA 季选推荐', date: '2024-09-28', note: '“华语乐坛罕见的细腻律动控制与都市夜景氛围”' }
    ],
    summary: '独立爵士名厂 Eating Music 精心打磨的都市爵士灵歌作品，器乐编排克制通透，不落俗套。',
    audioPreview: 'https://cdn.freesound.org/previews/557/557815_11861866-lq.mp3',
    links: {
      bandcamp: 'https://eatingmusic.bandcamp.com',
      streetvoice: '',
      spotify: 'https://open.spotify.com/search/Eating%20Music',
      netease: 'https://music.163.com/#/search/m/?s=Eating%20Music',
      original: 'https://eatingmusic.bandcamp.com'
    },
    isHighlight: false
  },
  {
    id: 'qiqi-records-postpunk',
    title: '南国雨季回信',
    artist: '海妖与野火',
    releaseDate: '2024-10-01',
    category: 'sinophone',
    genres: ['Post-Punk', 'Noise Pop', 'Cassette Culture'],
    label: '琪琪曲艺 (广州 DIY)',
    coverGradient: 'linear-gradient(135deg, #1f1c2c 0%, #928dab 100%)',
    coverArt: '',
    sources: [
      { source: '琪琪曲艺', badge: 'CASSETTE DROP', date: '2024-10-01', note: '限量 150 盘手工分装磁带' },
      { source: 'BIE别的', badge: '地下声音观察', date: '2024-10-05', note: '“潮湿南方的吉他失真墙与少年心气”' }
    ],
    summary: '广州独立地下厂牌琪琪曲艺发行的噪响后朋克，全真模拟磁带录制，低频脏重且充斥着生猛的现场能量。',
    audioPreview: 'https://cdn.freesound.org/previews/400/400584_5121236-lq.mp3',
    links: {
      bandcamp: 'https://qiqirecords.bandcamp.com',
      streetvoice: '',
      spotify: '',
      netease: 'https://music.163.com',
      original: 'https://qiqirecords.bandcamp.com'
    },
    isHighlight: false
  },

  // ================= 全球先锋地下 (Global Avant-Garde) =================
  {
    id: 'boomkat-clarissa-connelly',
    title: 'World of Work',
    artist: 'Clarissa Connelly',
    releaseDate: '2024-04-12',
    category: 'global',
    genres: ['Avant-Folk', 'Chamber Pop', 'Experimental Vocal'],
    label: 'Warp Records (UK)',
    coverGradient: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
    coverArt: '',
    sources: [
      { source: 'Boomkat', badge: 'STAFF PICK', date: '2024-04-05', note: '提前一周被 Boomkat 评为本周核心专辑' },
      { source: 'The Quietus', badge: 'ALBUM OF THE WEEK', date: '2024-04-15', note: '古北欧神话调式与当代合成器重生的奇迹' },
      { source: 'The Wire', badge: 'ISSUE REVIEW', date: '2024-05-01', note: '“在中世纪复调与前卫电子之间搭建的桥梁”' }
    ],
    summary: '哥本哈根音乐人在 Warp 旗下的惊艳首发，结合丹麦中世纪古调、管风琴与前卫室内乐。',
    audioPreview: 'https://cdn.freesound.org/previews/518/518218_6142149-lq.mp3',
    links: {
      bandcamp: 'https://clarissaconnelly.bandcamp.com',
      streetvoice: '',
      spotify: 'https://open.spotify.com/search/Clarissa%20Connelly',
      netease: 'https://music.163.com/#/search/m/?s=Clarissa%20Connelly',
      original: 'https://boomkat.com'
    },
    isHighlight: true
  },
  {
    id: 'bandcamp-daily-ambient-drone',
    title: 'Parallel Inquiries',
    artist: 'Rafael Anton Irisarri',
    releaseDate: '2024-08-30',
    category: 'global',
    genres: ['Ambient', 'Drone', 'Modern Classical'],
    label: 'Black Knoll Editions (US)',
    coverGradient: 'linear-gradient(135deg, #141e30 0%, #243b55 100%)',
    coverArt: '',
    sources: [
      { source: 'Bandcamp Daily', badge: 'BEST AMBIENT PICK', date: '2024-09-04', note: '九月前沿环境音乐专题首推' },
      { source: 'The Quietus', badge: 'QUIETUS RECOMMENDS', date: '2024-09-10', note: '巨浪般的磁带衰减与极低频共振' }
    ],
    summary: '现代环境音乐宗师在自家厂牌推出的最新长篇声景，如同一场缓缓覆盖地平线的暴风雨。',
    audioPreview: 'https://cdn.freesound.org/previews/467/467268_2694903-lq.mp3',
    links: {
      bandcamp: 'https://irisarri.bandcamp.com',
      streetvoice: '',
      spotify: 'https://open.spotify.com/search/Rafael%20Anton%20Irisarri',
      netease: 'https://music.163.com/#/search/m/?s=Rafael%20Anton%20Irisarri',
      original: 'https://daily.bandcamp.com'
    },
    isHighlight: false
  },
  {
    id: 'thewire-gegh-noise',
    title: 'Dispersal & Dissolution',
    artist: 'Uboa',
    releaseDate: '2024-02-28',
    category: 'global',
    genres: ['Death Industrial', 'Harsh Noise Wall', 'Gothic Avant-Garde'],
    label: 'The Flenser (US)',
    coverGradient: 'linear-gradient(135deg, #434343 0%, #000000 100%)',
    coverArt: '',
    sources: [
      { source: 'The Wire', badge: 'SOUND PROPULSION', date: '2024-03-10', note: '极端工业噪音与女性内心创伤的声波解剖' },
      { source: 'Boomkat', badge: 'BOOMKAT PICK', date: '2024-03-01', note: '极度压迫感同时具有崇高美感的噪音奇迹' }
    ],
    summary: '澳大利亚极端声学艺术家 Xandra Metcalfe 在另类名厂 The Flenser 的巨制，绝望又极度崇高的声音艺术。',
    audioPreview: 'https://cdn.freesound.org/previews/563/563503_9497060-lq.mp3',
    links: {
      bandcamp: 'https://uboa.bandcamp.com',
      streetvoice: '',
      spotify: 'https://open.spotify.com/search/Uboa',
      netease: 'https://music.163.com/#/search/m/?s=Uboa',
      original: 'https://www.thewire.co.uk'
    },
    isHighlight: false
  },

  // ================= 权威乐评与共识雷达 (Critical Consensus) =================
  {
    id: 'pitchfork-bnm-magdalena-bay',
    title: 'Imaginal Disk',
    artist: 'Magdalena Bay',
    releaseDate: '2024-08-23',
    category: 'critical',
    genres: ['Synthpop', 'Neo-Psychedelia', 'Progressive Pop'],
    label: 'Mom+Pop Music',
    coverGradient: 'linear-gradient(135deg, #3a1c71 0%, #d76d77 50%, #ffaf7b 100%)',
    coverArt: '',
    sources: [
      { source: 'Pitchfork', badge: 'BNM 8.5', date: '2024-08-26', note: 'Best New Music · 年度最佳概念合成器流行' },
      { source: 'Fantano', badge: 'SCORE: 9/10 (LOVED)', date: '2024-08-29', note: 'The Needle Drop 给出 9 分极高赞誉' },
      { source: 'RYM', badge: 'CHART #1 (3.92)', date: '2024-08-31', note: 'RateYourMusic 2024 年度总榜位列第一梯队' }
    ],
    summary: '今年全球乐评界最罕见的“超高共识神作”，兼具无敌悦耳的旋律与庞大深奥的科幻概念结构。',
    audioPreview: 'https://cdn.freesound.org/previews/415/415804_5121236-lq.mp3',
    links: {
      bandcamp: 'https://magdalenabay.bandcamp.com',
      streetvoice: '',
      spotify: 'https://open.spotify.com/search/Magdalena%20Bay',
      netease: 'https://music.163.com/#/search/m/?s=Magdalena%20Bay',
      youtube: 'https://www.youtube.com/watch?v=0k5G5hRkS5U',
      original: 'https://pitchfork.com/reviews/albums/magdalena-bay-imaginal-disk/'
    },
    isHighlight: true
  },
  {
    id: 'fantano-loved-cindy-lee',
    title: 'Diamond Jubilee',
    artist: 'Cindy Lee',
    releaseDate: '2024-03-29',
    category: 'critical',
    genres: ['Hypnagogic Pop', 'Girl Group Nostalgia', 'Lo-Fi Psychedelia'],
    label: 'Realistik Studios (Self-Released / GeoCities)',
    coverGradient: 'linear-gradient(135deg, #232526 0%, #414345 100%)',
    coverArt: '',
    sources: [
      { source: 'Pitchfork', badge: 'BNM 9.1 (HISTORIC)', date: '2024-04-02', note: '近五年最高分专辑之一' },
      { source: 'Fantano', badge: 'SCORE: 9/10', date: '2024-04-08', note: '不发流媒体、仅靠 YouTube 与网盘传播的纯粹传奇' },
      { source: 'The Wire', badge: 'LONG ESSAY', date: '2024-05-15', note: '对抗流媒体资本异化的独立奇迹' }
    ],
    summary: 'Patrick Flegel 耗时数年的双张巨制，拒绝登录任何主流流媒体，仅以自建网页网盘与 YouTube 传播，横扫全球顶级乐评。',
    audioPreview: 'https://cdn.freesound.org/previews/557/557815_11861866-lq.mp3',
    links: {
      bandcamp: '',
      streetvoice: '',
      spotify: '',
      netease: '',
      youtube: 'https://www.youtube.com/watch?v=kYI6k2b8UfE',
      original: 'https://pitchfork.com/reviews/albums/cindy-lee-diamond-jubilee/'
    },
    isHighlight: true
  },
  {
    id: 'pitchfork-bnm-charli-xcx',
    title: 'Brat',
    artist: 'Charli xcx',
    releaseDate: '2024-06-07',
    category: 'critical',
    genres: ['Hyperpop', 'Electropop', 'Club Bangers'],
    label: 'Atlantic Records',
    coverGradient: 'linear-gradient(135deg, #8ace00 0%, #70a700 100%)',
    coverArt: '',
    sources: [
      { source: 'Pitchfork', badge: 'BNM 8.6', date: '2024-06-07', note: '定义了今年夏天的 club 文化文化图腾' },
      { source: 'Fantano', badge: 'SCORE: 10/10 (CLASSIC)', date: '2024-06-10', note: '极少数获得满分认证的流行电子杰作' }
    ],
    summary: '不仅是现象级文化风暴，更是千禧电音与地下俱乐部舞曲在主流语境下的最硬核入侵。',
    audioPreview: 'https://cdn.freesound.org/previews/400/400584_5121236-lq.mp3',
    links: {
      bandcamp: '',
      streetvoice: '',
      spotify: 'https://open.spotify.com/search/Charli%20xcx%20Brat',
      netease: 'https://music.163.com/#/search/m/?s=Charli%20xcx%20Brat',
      original: 'https://pitchfork.com/reviews/albums/charli-xcx-brat/'
    },
    isHighlight: false
  }
];

export function getEntries() {
  return SEED_ENTRIES;
}
