/**
 * 全球音乐挖掘信源配置 (Global Music Digging Topology)
 * 100% 聚焦全球先锋实验、去中心化地下独立与权威乐评共识
 */
export const SOURCES = [
  // ================= 全球先锋地下 (Global Avant-Garde & Underground) =================
  {
    id: 'thewire',
    name: 'The Wire',
    tier: '1手源 · 先锋声音艺术',
    category: 'avant-garde',
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
    category: 'avant-garde',
    url: 'https://boomkat.com',
    feedType: 'curated',
    badge: 'BOOMKAT PICK',
    color: '#2f54eb',
    description: '英国曼彻斯特先锋唱片店，Staff Picks 往往比传统乐评早数周'
  },
  {
    id: 'thequietus',
    name: 'The Quietus',
    tier: '1手源 · 激进独立媒体',
    category: 'avant-garde',
    url: 'https://thequietus.com',
    feedType: 'rss',
    feedUrl: 'https://thequietus.com/feed/',
    badge: 'THE QUIETUS',
    color: '#52c41a',
    description: '专注于激进前卫摇滚、怪异实验电子与非主流乐潮'
  },
  {
    id: 'bandcamp_daily',
    name: 'Bandcamp Daily',
    tier: '1手源 · 去中心化策展',
    category: 'underground',
    url: 'https://daily.bandcamp.com',
    feedType: 'rss',
    feedUrl: 'https://daily.bandcamp.com/feed',
    badge: 'BANDCAMP DAILY',
    color: '#1890ff',
    description: '独立音乐最高频次深度挖掘专栏（Album of the Day / Essential Releases）'
  },

  // ================= 权威乐评与共识雷达 (Critical Consensus) =================
  {
    id: 'pitchfork_bnm',
    name: 'Pitchfork Reviews',
    tier: '2手源 · 权威乐评',
    category: 'critical',
    url: 'https://pitchfork.com/reviews/albums/',
    feedType: 'rss',
    feedUrl: 'https://pitchfork.com/feed/feed-album-reviews/rss',
    badge: 'PITCHFORK',
    color: '#f5222d',
    description: '权威独立音乐评测与 Best New Music 认证'
  },
  {
    id: 'stereogum',
    name: 'Stereogum (Album of the Week)',
    tier: '2手源 · 核心乐评',
    category: 'critical',
    url: 'https://www.stereogum.com/category/reviews/album-of-the-week/',
    feedType: 'rss',
    feedUrl: 'https://www.stereogum.com/category/reviews/album-of-the-week/feed/',
    badge: 'STEREOGUM AOTW',
    color: '#13c2c2',
    description: '每周深度长篇乐评与年度重点唱片锁定'
  },
  {
    id: 'fantano',
    name: 'The Needle Drop (Fantano)',
    tier: '2手源 · 视频乐评',
    category: 'critical',
    url: 'https://www.youtube.com/c/theneedledrop',
    feedType: 'youtube_rss',
    feedUrl: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCt7fwAhXDy3oNFTAzF2o8Pw',
    badge: 'FANTANO REVIEW',
    color: '#fa541c',
    description: '全球最具影响力个人乐评人，Weekly Track Roundup 与 Loved 评级'
  }
];
