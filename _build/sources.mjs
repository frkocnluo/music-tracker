/**
 * 挖掘信源配置 (Data Sources Topology)
 * 涵盖：欧美前卫与先锋地下、华语独立第一线、硬核社群与权威机构评测
 */
export const SOURCES = [
  // ================= 华语独立一线 (Sinophone Indie & Underground) =================
  {
    id: 'streetvoice_blow',
    name: 'StreetVoice 吹音乐 / 街声',
    tier: '0手源 · 独立前线',
    region: 'sinophone',
    url: 'https://streetvoice.com',
    feedType: 'rss',
    feedUrl: 'https://blow.streetvoice.com/feed/',
    badge: 'STREETVOICE',
    color: '#ff4d4f',
    description: '街声官方独立策展媒体，深度发片特写、街声即时榜与华语新声观察'
  },
  {
    id: 'fma',
    name: 'Freshmusic Awards',
    tier: '1.5手源 · 独立乐评',
    region: 'sinophone',
    url: 'https://freshmusic.sg',
    feedType: 'rss',
    feedUrl: 'https://freshmusic.sg/feed/',
    badge: 'FRESHMUSIC',
    color: '#fa8c16',
    description: '立足新马的华语中立乐评标杆，季度点评与年度大奖'
  },
  {
    id: 'svbkvlt',
    name: 'SVBKVLT',
    tier: '0手源 · 先锋厂牌',
    region: 'sinophone',
    url: 'https://svbkvlt.bandcamp.com',
    feedType: 'label_curated',
    badge: 'SVBKVLT',
    color: '#13c2c2',
    description: '上海地下先锋电子/解构俱乐部厂牌，常驻 The Wire / Pitchfork 视野'
  },
  {
    id: 'eatingmusic',
    name: 'Eating Music 宜听音乐',
    tier: '0手源 · 独立厂牌',
    region: 'sinophone',
    url: 'https://eatingmusic.bandcamp.com',
    feedType: 'label_curated',
    badge: 'EATING MUSIC',
    color: '#faad14',
    description: '深耕 Jazz-Hop、Neo-Soul、Lo-Fi Beat 的优质独立审美厂牌'
  },
  {
    id: 'qiqi',
    name: '琪琪曲艺 (Qiqi Records)',
    tier: '0手源 · DIY 磁带厂牌',
    region: 'sinophone',
    url: 'https://qiqirecords.bandcamp.com',
    feedType: 'label_curated',
    badge: 'QIQI RECORDS',
    color: '#eb2f96',
    description: '广州独立 DIY、独立摇滚与磁带文化前沿阵地'
  },

  // ================= 全球先锋地下 (Global Avant-Garde & Underground) =================
  {
    id: 'bandcamp_daily',
    name: 'Bandcamp Daily',
    tier: '1手源 · 去中心化策展',
    region: 'global',
    url: 'https://daily.bandcamp.com',
    feedType: 'rss',
    feedUrl: 'https://daily.bandcamp.com/feed',
    badge: 'BANDCAMP DAILY',
    color: '#1890ff',
    description: '独立音乐最高频次深度挖掘专栏（Album of the Day / Best Ambient / Best Metal）'
  },
  {
    id: 'thequietus',
    name: 'The Quietus',
    tier: '1手源 · 激进独立媒体',
    region: 'global',
    url: 'https://thequietus.com',
    feedType: 'rss',
    feedUrl: 'https://thequietus.com/feed/',
    badge: 'THE QUIETUS',
    color: '#52c41a',
    description: '专注于激进前卫摇滚、怪异实验电子与非主流乐潮'
  },
  {
    id: 'thewire',
    name: 'The Wire',
    tier: '1手源 · 先锋声音艺术',
    region: 'global',
    url: 'https://www.thewire.co.uk',
    feedType: 'curated',
    badge: 'THE WIRE',
    color: '#722ed1',
    description: 'Adventures in Modern Music，全球先锋实验与声音艺术最高殿堂'
  },
  {
    id: 'boomkat',
    name: 'Boomkat',
    tier: '0手源 · 先锋唱片店',
    region: 'global',
    url: 'https://boomkat.com',
    feedType: 'curated',
    badge: 'BOOMKAT PICK',
    color: '#2f54eb',
    description: '英国曼彻斯特先锋唱片店，Staff Picks 往往比传统乐评早数周'
  },

  // ================= 权威乐评与共识雷达 (Critical Consensus) =================
  {
    id: 'pitchfork_bnm',
    name: 'Pitchfork Reviews',
    tier: '2手源 · 权威乐评',
    region: 'critical',
    url: 'https://pitchfork.com/reviews/albums/',
    feedType: 'rss',
    feedUrl: 'https://pitchfork.com/feed/feed-album-reviews/rss',
    badge: 'PITCHFORK',
    color: '#f5222d',
    description: '权威独立音乐评测与 Best New Music 认证'
  },
  {
    id: 'fantano',
    name: 'The Needle Drop (Fantano)',
    tier: '2手源 · 视频乐评',
    region: 'critical',
    url: 'https://www.youtube.com/c/theneedledrop',
    feedType: 'youtube_rss',
    feedUrl: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCt7fwAhXDy3oNFTAzF2o8Pw',
    badge: 'FANTANO REVIEW',
    color: '#fa541c',
    description: '全球最具影响力个人乐评人，Weekly Track Roundup 与 Loved 评级'
  }
];
