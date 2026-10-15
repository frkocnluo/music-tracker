import { getScoresForRelease } from './scores.mjs';
import { readCache } from './fetch.mjs';
import { SOURCES, FETCH_POLICY } from './sources.mjs';

/**
 * 数据层：把「原始订阅条目」加工成「雷达实体」
 *
 * 本版相对旧版的关键修正
 *  1. 流派推断改为词边界匹配（旧版 text.includes('rock') 会把 "rockers" 判成 Rock、
 *     "traps" 判成 Rap、"bassist" 判成 Bass），并把命中率从 34% 提升到覆盖主流描述词。
 *  2. 增加跨源去重：同一张唱片被 Pitchfork + Stereogum 同时收录时合并为一条多源共识，
 *     而不是在卡片墙里出现两次。
 *  3. 艺人名提取增加置信度标记；无法可靠拆分时不再伪造艺人名（如 getP4kArtist 的
 *     「slug 一刀切一半」分支）。
 *  4. 摘要改为整句截断，不再出现 150 字符硬切导致的半句话。
 */

/* ------------------------------------------------------------------ *
 * 配色：由标题稳定哈希到渐变
 * 仅用于无封面卡片（如 Bandcamp / Quietus 不提供封面）的占位底。
 * 取值限定在黑—灰区间并带极淡色相偏移，避免高饱和渐变抢走封面主体。
 * ------------------------------------------------------------------ */

const GRADIENT_PALETTES = [
  'linear-gradient(135deg, #100f0f 0%, #2c2c2c 100%)',
  'linear-gradient(135deg, #1a1a1a 0%, #3a3a3a 100%)',
  'linear-gradient(135deg, #100f0f 0%, #1f2a2e 100%)',
  'linear-gradient(135deg, #0d0d0d 0%, #262626 100%)',
  'linear-gradient(135deg, #141414 0%, #333333 100%)',
  'linear-gradient(135deg, #101010 0%, #1e2328 100%)',
  'linear-gradient(135deg, #2c2c2c 0%, #100f0f 100%)',
  'linear-gradient(135deg, #1c1c1c 0%, #444444 100%)',
  'linear-gradient(135deg, #0f0f12 0%, #20222b 100%)',
  'linear-gradient(135deg, #16181a 0%, #2f3538 100%)',
  'linear-gradient(135deg, #12100f 0%, #2a1f1c 100%)'
];

function getGradientForString(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return GRADIENT_PALETTES[Math.abs(hash) % GRADIENT_PALETTES.length];
}

/* ------------------------------------------------------------------ *
 * 流派推断：词边界 + 加权关键词表
 * ------------------------------------------------------------------ */

/** 每个流派一组词；全部按「词边界」匹配，避免子串误判 */
const GENRE_RULES = [
  {
    tag: 'Electronic / Club',
    words: ['electronic', 'electronica', 'techno', 'house', 'club', 'dance', 'synth', 'synths', 'synthpop', 'bass', 'garage', 'grime', 'jungle', 'drum', 'breakbeat', 'dubstep', 'rave', 'trance', 'electro', 'idm', 'footwork', 'deconstructed', 'hyperpop', 'edm', 'downtempo', 'trip-hop', 'big beat', 'banger', 'four-on-the-floor', 'modular', 'sequencer', 'second line']
  },
  {
    tag: 'Post-Punk / Rock',
    words: ['rock', 'rocks', 'punk', 'guitar', 'guitars', 'indie rock', 'garage rock', 'noise rock', 'shoegaze', 'hardcore', 'metal', 'doom', 'sludge', 'post-rock', 'math rock', 'emo', 'screamo', 'goth', 'industrial rock', 'art rock', 'krautrock', 'psych', 'psychedelic', 'riff', 'riffs', 'band', 'trio', 'quartet', 'hardcore punk', 'mathcore', 'slowcore', 'grunge']
  },
  {
    tag: 'Indie Pop / Bedroom',
    words: ['pop', 'poptimist', 'indie pop', 'dream pop', 'bedroom', 'singer-songwriter', 'folk', 'lo-fi', 'twee', 'jangle', 'power pop', 'soft rock', 'sophisti-pop', 'songwriter', 'songwriting', 'hooks', 'chorus', 'ballad', 'acoustic', 'americana', 'country', 'outlaw country', 'bluegrass', 'roots']
  },
  {
    tag: 'Ambient / Drone',
    words: ['ambient', 'drone', 'field recording', 'field recordings', 'minimal', 'minimalism', 'minimalist', 'soundscape', 'soundscapes', 'new age', 'lowercase', 'tape', 'musique', 'reverb', 'texture', 'textures', 'atmospheric', 'meditation', 'generative']
  },
  {
    tag: 'Neo-Soul / Jazz / Beats',
    words: ['jazz', 'soul', 'r&b', 'rnb', 'hip-hop', 'hip hop', 'rap', 'rapper', 'beats', 'beat', 'funk', 'gospel', 'afrobeat', 'broken beat', 'neo-soul', 'trap', 'dub', 'reggae', 'dancehall', 'amapiano', 'rhythm', 'groove', 'grooves', 'swing', 'bop', 'spiritual', 'blues', 'crate']
  },
  {
    tag: 'Avant-Garde / Noise',
    words: ['experimental', 'avant-garde', 'avant', 'noise', 'industrial', 'improvisation', 'improvised', 'free jazz', 'sound art', 'electroacoustic', 'classical', 'composition', 'composer', 'spectral', 'harsh', 'power electronics', 'spoken word', 'unconventional', 'abstract', 'collage', 'process music', 'microtonal', 'opera', 'chamber', 'orchestral', 'orchestra', 'symphonic', 'black metal', 'brutal', 'extreme']
  }
];

const RE_CACHE = new Map();
function wordRegex(word) {
  if (!RE_CACHE.has(word)) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    RE_CACHE.set(word, new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, 'i'));
  }
  return RE_CACHE.get(word);
}

export function inferGenres(title = '', desc = '', extra = '', categories = []) {
  // 优先使用出版方自带的分类标签：Bandcamp Daily 的 <category> 直接就是流派
  // ("Best Jazz" / "Best Electronic" / "Best Field Recordings" …)，比正文关键词可靠得多
  const tagText = categories.join(' ');
  const text = `${title} ${desc} ${extra} ${tagText}`;
  const tags = [];
  for (const rule of GENRE_RULES) {
    if (rule.words.some((w) => wordRegex(w).test(tagText))) tags.push(rule.tag);
  }
  if (tags.length === 0) {
    for (const rule of GENRE_RULES) {
      if (rule.words.some((w) => wordRegex(w).test(text))) tags.push(rule.tag);
    }
  }
  // 未识别就返回空：「Genre N/A」曾占 45 条并作为可点筛选 chip，对用户没有信息量
  return tags;
}

/* ------------------------------------------------------------------ *
 * 艺人名 / 标题拆分
 * ------------------------------------------------------------------ */

const ENTITY_MAP = {
  amp: 'and', apos: '', rsquo: '', lsquo: '', quot: '', nbsp: ' '
};

/** 归一化用于 slug 比对：去实体、去撇号、& → and、非字母数字 → '-' */
function normForSlug(s = '') {
  return s
    .replace(/&#(\d+);|&#x([0-9a-f]+);|&([a-z]+);/gi, (m, d, h, n) => {
      if (d) return String.fromCodePoint(+d);
      if (h) return String.fromCodePoint(parseInt(h, 16));
      return n && n.toLowerCase() in ENTITY_MAP ? ENTITY_MAP[n.toLowerCase()] : ' ';
    })
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function titleCase(slug = '') {
  const small = new Set(['of', 'the', 'and', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'with', 'vs']);
  return slug
    .split('-')
    .filter(Boolean)
    .map((w, i) => (i > 0 && small.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

/**
 * Pitchfork 的 slug 形如 /reviews/albums/<artist>-<album-slug>/
 * 用「标题归一化后缀匹配」代替旧版的「长度对半砍」。
 */
export function derivePitchforkArtist(title, link) {
  const slug = (link.match(/\/reviews\/albums\/([^/]+)\/?/) || [])[1] || '';
  if (!slug) return { artist: '', confidence: 'unknown' };

  const cleanTitle = normForSlug(title);
  if (cleanTitle && slug.endsWith('-' + cleanTitle)) {
    return { artist: titleCase(slug.slice(0, -(cleanTitle.length + 1))), confidence: 'high' };
  }
  // 标题尾部可能是 "EP"/"LP" 等后缀，尝试裁掉末词再匹配
  const words = cleanTitle.split('-').filter(Boolean);
  for (let drop = 1; drop <= 2 && words.length - drop > 0; drop++) {
    const shorter = words.slice(0, words.length - drop).join('-');
    if (shorter && slug.endsWith('-' + shorter)) {
      return { artist: titleCase(slug.slice(0, -(shorter.length + 1))), confidence: 'high' };
    }
  }
  // 退化方案：题名首词在 slug 中的位置作为切分点（仅当前方剩余长度合理时采纳）
  const idx = slug.split('-').findIndex((p, i) => i > 0 && p === words[0]);
  if (idx > 0 && slug.length - slug.split('-').slice(idx).join('-').length > 2) {
    return { artist: titleCase(slug.split('-').slice(0, idx).join('-')), confidence: 'guessed' };
  }
  return { artist: '', confidence: 'unknown' };
}

const STEREOGUM_STOPWORDS = new Set([
  'live', 'at', 'the', 'a', 'an', 'and', 'in', 'on', 'of', 'to', 'for', 'with', 'ep',
  'album', 'vol', 'part', 'ii', 'iii', 'deluxe', 'remaster'
]);

/** Stereogum 分类法中的通用标签，不是艺人名 */
const STEREOGUM_TAXONOMY = new Set([
  'album of the week', 'reviews', 'music', 'news', 'features', 'columns',
  'premiere', 'video', 'songs', 'albums', 'upcoming releases', 'the anniversary'
]);

/**
 * Stereogum 标题格式为 "Album Of The Week: <Artist> <Album>"，中间没有分隔符，
 * 旧版依赖一份 25 人硬编码名单 + 「取前两个词」，名单外艺人和单名艺人都会被切错。
 *
 * 实测发现 Stereogum 的 <category> 中直接包含艺人名（如 "Sophia Stel" / "Cameron Winter"），
 * 因此优先使用分类标签推导艺人名，标题大写词块启发式仅作兜底。
 */
export function deriveStereogumArtist(cleaned, categories = []) {
  const artistCats = categories.filter((c) => !STEREOGUM_TAXONOMY.has(c.toLowerCase().trim()));
  const hit = artistCats.find((c) => {
    const norm = c.toLowerCase().trim();
    return norm && cleaned.toLowerCase().includes(norm);
  });
  if (hit) {
    const title = cleaned.slice(cleaned.toLowerCase().indexOf(hit.toLowerCase()) + hit.length).trim();
    return { artist: hit.trim(), title: title || cleaned, confidence: 'high' };
  }

  const tokens = cleaned.split(/\s+/).filter(Boolean);
  const run = [];
  for (const tok of tokens) {
    const word = tok.replace(/[^\w'’&-]/g, '');
    if (!word) break;
    const isCapitalized = /^[A-Z]/.test(word) || /^[A-Z]{2,}$/.test(word);
    const isStop = STEREOGUM_STOPWORDS.has(word.toLowerCase());
    if (!isCapitalized && run.length === 0) break;
    if (isCapitalized && !isStop) { run.push(word); continue; }
    break;
  }
  if (run.length >= 1 && run.length <= 4 && run.length < tokens.length) {
    return { artist: run.join(' '), title: tokens.slice(run.length).join(' '), confidence: run.length >= 2 ? 'high' : 'guessed' };
  }
  return { artist: '', title: cleaned, confidence: 'unknown' };
}

/**
 * 从标题中清洗出 artist / title / itemType
 * 返回值新增 artistConfidence，供前端弱化显示低置信度艺人名
 */
export function extractArtistAndTitle(rawTitle, link, sourceId, categories = []) {
  let artist = '';
  let artistConfidence = 'high';
  let title = String(rawTitle || '');
  let itemType = 'release';
  let itemTypeLabel = 'ALBUM';
  let itemTypeNote = '';

  if (sourceId === 'fantano') {
    if (/ALBUM REVIEW|EP REVIEW|MIXTAPE REVIEW/i.test(rawTitle)) {
      itemTypeLabel = /EP REVIEW/i.test(rawTitle) ? 'EP REVIEW' : 'ALBUM REVIEW';
      const cleaned = rawTitle.replace(/(ALBUM|EP|MIXTAPE) REVIEW/gi, '').trim();
      if (cleaned.includes(' - ')) {
        const [a, ...rest] = cleaned.split(' - ');
        artist = a.trim();
        title = rest.join(' - ').trim();
      } else {
        title = cleaned;
        artistConfidence = 'unknown';
      }
    } else {
      itemType = 'roundup';
      itemTypeLabel = 'ROUNDUP 视频盘点';
      itemTypeNote = '视频综合盘点（非单一专辑评分）';
      artist = 'Anthony Fantano';
      title = rawTitle;
    }
  } else if (sourceId === 'stereogum') {
    itemTypeLabel = 'ALBUM OF THE WEEK';
    const cleaned = rawTitle.replace(/^Album Of The Week:\s*/i, '').trim();
    const d = deriveStereogumArtist(cleaned, categories);
    artist = d.artist;
    title = d.title;
    artistConfidence = d.confidence;
  } else if (sourceId === 'pitchfork_bnm') {
    itemTypeLabel = 'PITCHFORK REVIEW';
    const d = derivePitchforkArtist(rawTitle, link);
    artist = d.artist;
    artistConfidence = d.confidence;
    title = rawTitle;
  } else if (sourceId === 'bandcamp_daily') {
    const match = rawTitle.match(/^(.*?),\s*[“"'(](.*?)[”"')]/);
    if (match) {
      itemTypeLabel = 'BANDCAMP ESSENTIAL';
      artist = match[1].trim();
      title = match[2].trim();
    } else if (/The Best |Essential Releases|The Hotlist/i.test(rawTitle)) {
      itemType = 'feature';
      itemTypeLabel = 'FEATURE 深度专栏';
      itemTypeNote = 'Bandcamp 专题策展（非单一专辑）';
      artist = 'Bandcamp Daily';
      title = rawTitle;
    } else {
      itemType = 'feature';
      itemTypeLabel = 'CURATED 深度特稿';
      itemTypeNote = '深度音乐人特稿（非单一专辑）';
      artist = 'Bandcamp Curated';
      title = rawTitle;
    }
  } else if (sourceId === 'thequietus') {
    if (/Interview/i.test(rawTitle)) {
      itemType = 'interview';
      itemTypeLabel = 'INTERVIEW 深度专访';
      itemTypeNote = '前卫声音专访对话（非单一唱片评测）';
      const m = rawTitle.match(/Interview with (.*)$/i) || rawTitle.match(/^(.*?): An Interview/i) || rawTitle.match(/^(.*?)\s+Interviewed/i);
      artist = m ? m[1].trim() : '';
      title = rawTitle;
      artistConfidence = m ? 'high' : 'unknown';
    } else if (/Podcast/i.test(rawTitle)) {
      itemType = 'podcast';
      itemTypeLabel = 'PODCAST 声音播客';
      itemTypeNote = '长篇文化对谈播客（不计专辑评分）';
      artist = 'The Quietus Podcast';
      title = rawTitle;
    } else if (/ [–-] /.test(rawTitle)) {
      itemTypeLabel = 'QUIETUS REVIEW';
      const parts = rawTitle.split(/ [–-] /);
      artist = parts[0].trim();
      title = parts.slice(1).join(' - ').trim();
    } else if (/Shares Song|Reveals New|Unveils New|Plots New|Sentence for|Detail/i.test(rawTitle)) {
      itemType = 'news';
      itemTypeLabel = 'NEWS 行业动态';
      itemTypeNote = '先锋音乐前沿速递（非专辑评测）';
      artist = 'The Quietus Dispatch';
      title = rawTitle;
    } else {
      itemType = 'feature';
      itemTypeLabel = 'FEATURE 专栏报道';
      itemTypeNote = '音乐文化深度观察（非单一唱片）';
      artist = 'The Quietus Feature';
      title = rawTitle;
    }
  } else if (sourceId === 'thewire') {
    if (/^News/i.test(rawTitle) || /Vacancy|Announce|Job|Fund|Call for|guests on|in residence|responds to|has died|releases/i.test(rawTitle)) {
      itemType = 'news';
      itemTypeLabel = 'WIRE NEWS 行业动态';
      itemTypeNote = '先锋音乐行业动态（非专辑评测）';
      artist = '';
      artistConfidence = 'unknown';
      title = rawTitle;
    } else {
      itemTypeLabel = 'THE WIRE';
      const m = rawTitle.match(/^(.*?)\s*[–—]\s*(.+)$/) || rawTitle.match(/^([^:]+):\s*(.+)$/);
      if (m) { artist = m[1].trim(); title = m[2].trim(); }
      else { artist = ''; title = rawTitle; artistConfidence = 'unknown'; }
    }
  }

  if (!artist) artist = '';
  if (!title) title = rawTitle;

  return { artist, title, artistConfidence, itemType, itemTypeLabel, itemTypeNote };
}

/* ------------------------------------------------------------------ *
 * 摘要：清掉订阅里的出版方样板句 + 整句截断
 * ------------------------------------------------------------------ */

/**
 * 订阅源常把版权/跳转样板塞进 description：
 *   "The post Album Of The Week: … appeared first on Stereogum ."
 *   "Read full story on the Bandcamp Daily ."
 * 旧版会把这些原样当成「乐评摘要」显示在卡片上。
 */
export function cleanPublisherBoilerplate(text = '') {
  return String(text)
    .replace(/The post\s+.*?\s+appeared first on\s+[^.]+\.?/gi, ' ')
    .replace(/Read (the )?full (story|post|article)[^.]*\.?/gi, ' ')
    .replace(/Continue reading[^.]*\.?/gi, ' ')
    .replace(/\(?Appears? on[^.)]*\)?\.?/gi, ' ')
    .replace(/^\s*Read more\s*[»›>]*\s*/i, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function craftSummary(text, limit = 220) {
  const clean = cleanPublisherBoilerplate(String(text || '').replace(/\s+/g, ' ').trim());
  if (!clean) return '';
  if (clean.length <= limit) return clean;
  // 优先在句末切
  const window = clean.slice(0, limit + 60);
  const m = window.match(/^[\s\S]*?[.!?。！？](?=\s|$)/);
  if (m && m[0].length <= limit + 10 && m[0].length >= 60) return m[0].trim();
  // 退而求其次在词边界切
  const cut = clean.slice(0, limit);
  const sp = cut.lastIndexOf(' ');
  return (sp > limit * 0.6 ? cut.slice(0, sp) : cut).trim() + '…';
}

/* ------------------------------------------------------------------ *
 * 主流程
 * ------------------------------------------------------------------ */

/** 多源共识时用于挑选「主信源」的优先级 */
const SOURCE_PRIORITY = ['pitchfork_bnm', 'stereogum', 'fantano', 'bandcamp_daily', 'thequietus', 'thewire', 'boomkat'];

const daysBetween = (a, b) => Math.round((a - b) / 86400000);

export function getRadarData() {
  const cache = readCache();
  const sourceMeta = new Map(cache.sources.map((s) => [s.sourceId, s]));
  const enrichment = cache.enrichment || {};
  const now = Date.now();
  const buckets = new Map(); // dedupKey -> merged entry

  for (const source of cache.sources) {
    const sourceDef = SOURCES.find((s) => s.id === source.sourceId);
    const category = source.category || sourceDef?.category || 'critical';

    for (const item of source.items || []) {
      const categories = item.categories || [];
      let { artist, title, artistConfidence, itemType, itemTypeLabel, itemTypeNote } =
        extractArtistAndTitle(item.title, item.link, source.sourceId, categories);

      // Pitchfork：若抓取阶段已从评论页拿到权威 og:title("<Artist>: <Album>")，直接采用
      const verified = enrichment[item.link];
      if (verified) {
        artist = verified.artist;
        title = verified.album;
        artistConfidence = 'verified';
      }

      const summary = craftSummary(item.description);
      // 只有「发行」条目才谈流派；专栏/新闻/专访/播客强行贴流派本身就是噪音
      const genres = itemType === 'release'
        ? inferGenres(item.title, item.description, artist, categories)
        : [];
      const scores = getScoresForRelease(title, artist, source.sourceId, item.description || '', itemType);
      const releaseDate = item.pubDate || null;
      const ageDays = releaseDate ? Math.max(0, daysBetween(new Date(), new Date(releaseDate))) : null;

      const entry = {
        title,
        rawTitle: item.title,
        artist,
        artistConfidence,
        releaseDate,
        ageDays,
        isFresh: ageDays === null ? true : ageDays <= FETCH_POLICY.maxStaleDays,
        category,
        genres,
        itemType,
        itemTypeLabel,
        itemTypeNote,
        summary,
        // 降级信源的封面不可信：The Quietus 在 Cloudflare 拦截下对所有资源
        // 返回 403 + Cross-Origin-Resource-Policy: same-origin，
        // 浏览器会直接拦掉这些 <img>（ERR_BLOCKED_BY_RESPONSE.NotSameOrigin）。
        // 此时不渲染 img，改用渐变+首字母占位，避免一次性发起注定失败的请求。
        coverArt: source.ok === true ? item.imageUrl || '' : '',
        audioSrc: item.audioSrc || '',
        embedId: item.embedId || '',
        coverGradient: getGradientForString(item.title + artist),
        scores,
        sourceOk: source.ok === true,
        links: {
          original: item.link,
          // 其余平台链接改由前端按 artist/title 模板拼装，避免在 HTML 里重复 4 份长 URL
          sourceId: source.sourceId
        },
        sources: [
          {
            sourceId: source.sourceId,
            source: source.badge,
            sourceName: source.sourceName,
            badge: itemType === 'release' ? 'LIVE DROP' : itemType.toUpperCase(),
            date: releaseDate,
            note: item.title,
            url: item.link
          }
        ],
        isHighlight: false,
        isLiveStream: true
      };

      const key = `${normKey(artist)}|${normKey(title)}`;
      // 非发行条目（专栏/新闻/播客）不做跨源合并，避免误并
      if (itemType !== 'release' || key === '|') {
        buckets.set(`solo:${source.sourceId}:${item.link}`, entry);
        continue;
      }

      const exist = buckets.get(key);
      if (!exist) {
        buckets.set(key, entry);
        continue;
      }

      // 合并：保留覆盖率更好的字段，累积信源
      const merged = exist;
      merged.sources.push(...entry.sources);
      merged.genres = [...new Set([...merged.genres, ...entry.genres])];
      if (!merged.coverArt && entry.coverArt) merged.coverArt = entry.coverArt;
      if (!merged.embedId && entry.embedId) merged.embedId = entry.embedId;
      if (!merged.audioSrc && entry.audioSrc) merged.audioSrc = entry.audioSrc;
      if ((entry.summary || '').length > (merged.summary || '').length) merged.summary = entry.summary;
      if (!merged.artist && entry.artist) merged.artist = entry.artist;
      if (merged.artistConfidence === 'unknown' && entry.artistConfidence !== 'unknown') {
        merged.artist = entry.artist;
        merged.artistConfidence = entry.artistConfidence;
      }
      // 日期取更早的一次发布（首次被收录）
      if (entry.releaseDate && (!merged.releaseDate || entry.releaseDate < merged.releaseDate)) {
        merged.releaseDate = entry.releaseDate;
        merged.ageDays = entry.ageDays;
        merged.isFresh = entry.isFresh;
      }
      // 评分取优先级更高的一方
      const p = (id) => SOURCE_PRIORITY.indexOf(id);
      if (p(entry.links.sourceId) < p(merged.links.sourceId)) {
        merged.scores = entry.scores;
        merged.itemType = entry.itemType;
        merged.itemTypeLabel = entry.itemTypeLabel;
        merged.itemTypeNote = entry.itemTypeNote;
      }
    }
  }

  const entries = [...buckets.values()]
    .map((e) => ({
      ...e,
      sourceCount: new Set(e.sources.map((s) => s.sourceId)).size,
      primarySourceId: e.links.sourceId,
      label: sourceMeta.get(e.links.sourceId)?.sourceName || '',
      id: `e-${Math.abs(hashCode(`${e.artist}|${e.title}|${e.releaseDate}`)).toString(36)}`
    }))
    .sort((a, b) => {
      const da = a.releaseDate || '0000-00-00';
      const db = b.releaseDate || '0000-00-00';
      // 同日条目很多（单日最多 17 条），按「多源共识 > 可试听 > 有评分」定先后，而不是随机
      return db.localeCompare(da) || signal(b) - signal(a);
    });

  return { entries, cache, sourceMeta };
}

function signal(e) {
  const rated = Object.values(e.scores || {}).some((s) => s && s.status && s.status !== 'unrated');
  return (e.sourceCount > 1 ? 4 : 0) + (e.embedId || e.audioSrc ? 2 : 0) + (rated ? 1 : 0);
}

function normKey(s = '') {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function hashCode(s = '') {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i) | 0;
  return h;
}

/** 向后兼容：build.mjs 仍可直接取条目数组 */
export function getEntries() {
  return getRadarData().entries;
}
