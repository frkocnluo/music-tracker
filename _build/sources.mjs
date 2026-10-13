/**
 * 全球音乐挖掘信源配置 (Global Music Digging Topology)
 * 100% 聚焦全球先锋实验、去中心化地下独立与权威乐评共识
 *
 * 字段说明
 *  - feedUrl   : 可被 Node 原生 fetch 拉取的 RSS/Atom 地址；为空表示该源无公开订阅接口
 *  - feedType  : rss | youtube_rss | none
 *  - category  : avant-garde | underground | critical  (决定前端 Tab 归属)
 *  - waf       : 已知的源站防护（仅用于提示与降级说明，不参与逻辑判断）
 */

export const SOURCES = [
  // ================= 全球先锋地下 (Global Avant-Garde & Underground) =================
  {
    id: 'thewire',
    name: 'The Wire',
    tier: '1手源 · 先锋声音艺术',
    category: 'avant-garde',
    url: 'https://www.thewire.co.uk',
    feedType: 'rss',
    // 修复：The Wire 主站无 /rss，但 news 频道提供合法 RSS（已实测 200 / 10 items）
    feedUrl: 'https://www.thewire.co.uk/news/rss',
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
    feedType: 'none',
    // 实测：boomkat.com/products.atom 返回 403，站点无公开订阅接口
    // 保留为「编辑策展位」而非伪装成实时信源
    feedUrl: null,
    curatedOnly: true,
    note: 'Boomkat 无公开 RSS/Atom（products.atom 返回 403），仅作为人工策展位保留。',
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
    // 实测：整个域名（含 /feed/、/wp-json/、/sitemap.xml、首页）均返回 403
    // 响应体为 Cloudflare "Just a moment..." JS 挑战页，换 Googlebot/Feedfetcher/curl UA 亦为 403。
    // 保留 feedUrl 以便 WAF 解除后自动恢复；抓取失败时保留上次成功快照并标记为 stale。
    waf: 'cloudflare-js-challenge',
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
    // 实测：daily.bandcamp.com 存在间歇性 TLS 重置 (ECONNRESET)，必须重试
    unstable: true,
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
    description: '权威独立音乐评测与 Best New Music 认证',
    // 实测：feed-best-new-music/rss 与 feed-reviews/rss 均 404；
    // 唯一可用订阅源不含 Best New Music 标记，故前端不再伪造 BNM 高亮。
    noBnmFlag: true
  },
  {
    id: 'stereogum',
    name: 'Stereogum (Album of the Week)',
    tier: '2手源 · 核心乐评',
    category: 'critical',
    url: 'https://www.stereogum.com/category/reviews/album-of-the-week/',
    feedType: 'rss',
    feedUrl: 'https://www.stereogum.com/category/reviews/album-of-the-week/feed/',
    // 实测响应 5.3s，原 8s 超时在高延迟链路下会误杀该源
    slow: true,
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

/** 抓取调优参数（集中管理，便于按信源覆盖） */
export const FETCH_POLICY = {
  timeoutMs: 20000,      // 单次请求超时（原 8000ms 会误杀 Stereogum）
  retries: 3,            // 网络层失败重试次数（除 403/404 等确定性失败）
  backoffMs: 800,        // 退避基数：800 / 1600 / 3200
  itemLimit: 40,         // 每源保留条目上限（原 25 会丢弃近半内容）
  maxStaleDays: 45,      // 超过该天数的条目不再计入「实时电波流」
  enrichLimit: 40,       // 单轮最多精修多少条 Pitchfork 艺人名
  enrichConcurrency: 5   // 精修请求并发度
};
