import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOURCES } from './sources.mjs';
import { getScoresForRelease } from './scores.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_FILE = path.join(__dirname, 'cache.json');

// 现代深色高质感渐变色板
const GRADIENT_PALETTES = [
  'linear-gradient(135deg, #09203f 0%, #537895 100%)',
  'linear-gradient(135deg, #1f1c2c 0%, #928dab 100%)',
  'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
  'linear-gradient(135deg, #141e30 0%, #243b55 100%)',
  'linear-gradient(135deg, #3a1c71 0%, #d76d77 50%, #ffaf7b 100%)',
  'linear-gradient(135deg, #2b5876 0%, #4e4376 100%)',
  'linear-gradient(135deg, #434343 0%, #000000 100%)',
  'linear-gradient(135deg, #232526 0%, #414345 100%)',
  'linear-gradient(135deg, #000428 0%, #004e92 100%)',
  'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)',
  'linear-gradient(135deg, #1a2a6c 0%, #b21f1f 50%, #fdbb2d 100%)'
];

function getGradientForString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % GRADIENT_PALETTES.length;
  return GRADIENT_PALETTES[index];
}

/**
 * 智能流派推断 (欧美先锋、另类与独立流派)
 */
function inferGenres(title, desc) {
  const text = `${title} ${desc}`.toLowerCase();
  const tags = [];

  if (text.includes('electronic') || text.includes('club') || text.includes('techno') || text.includes('dance') || text.includes('synth') || text.includes('house') || text.includes('bass')) {
    tags.push('Electronic / Club');
  }
  if (text.includes('rock') || text.includes('punk') || text.includes('post-punk') || text.includes('guitar') || text.includes('indie rock') || text.includes('garage')) {
    tags.push('Post-Punk / Rock');
  }
  if (text.includes('ambient') || text.includes('drone') || text.includes('soundscape') || text.includes('field recording') || text.includes('minimalism')) {
    tags.push('Ambient / Drone');
  }
  if (text.includes('pop') || text.includes('bedroom') || text.includes('folk') || text.includes('indie pop') || text.includes('dream pop') || text.includes('shoegaze')) {
    tags.push('Indie Pop / Bedroom');
  }
  if (text.includes('jazz') || text.includes('soul') || text.includes('r&b') || text.includes('hip-hop') || text.includes('rap') || text.includes('beats')) {
    tags.push('Neo-Soul / Jazz / Beats');
  }
  if (text.includes('classical') || text.includes('experimental') || text.includes('avant-garde') || text.includes('noise') || text.includes('industrial') || text.includes('improvisation')) {
    tags.push('Avant-Garde / Noise');
  }

  if (tags.length === 0) {
    tags.push('Alternative / Digging');
  }
  return tags;
}

const KNOWN_STEREOGUM_ARTISTS = [
  'Cameron Winter', 'Greg Freeman', 'Gilla Band', 'Slow Pulp', 'This Is Lorelei',
  'Lily Seabird', 'Maripool', 'Westside Cowboy', 'L\'Rain', 'Ceremony',
  'Mallory Hawk', 'Nick Hakim', 'Quicksand', 'Kelela', 'Nixon Boyd',
  'Tasha', 'Styrofoam Winos', 'Wiki', 'Slippers', 'ear', 'Lowertown',
  'Touch Girl Apple Blossom', 'Aldous Harding', 'Lip Critic', 'Carla dal Forno'
];

function getP4kArtist(title, link) {
  const slug = (link.match(/\/reviews\/albums\/([^/]+)\/?/) || [])[1] || '';
  if (!slug) return 'Pitchfork Pick';
  const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  let artistSlug = '';
  if (cleanTitle && slug.endsWith('-' + cleanTitle)) {
    artistSlug = slug.slice(0, -(cleanTitle.length + 1));
  } else {
    const titleWords = title.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    const slugParts = slug.split('-');
    const firstWordIdx = slugParts.findIndex((part, idx) => idx > 0 && titleWords[0] === part);
    if (firstWordIdx > 0) {
      artistSlug = slugParts.slice(0, firstWordIdx).join('-');
    } else {
      artistSlug = slugParts.slice(0, Math.ceil(slugParts.length / 2)).join('-');
    }
  }
  return artistSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * 从信源标题中清洗出 Artist、Title 与条目类型 (itemType)
 */
function extractArtistAndTitle(rawTitle, link, sourceId) {
  let artist = 'Independent Artist';
  let title = rawTitle.replace(/&#8217;/g, "'").replace(/&#8216;/g, "'").replace(/&amp;/g, '&');
  let itemType = 'release';
  let itemTypeLabel = 'ALBUM';
  let itemTypeNote = '';

  if (sourceId === 'fantano') {
    if (/ALBUM REVIEW|EP REVIEW/i.test(rawTitle)) {
      itemType = 'release';
      itemTypeLabel = 'ALBUM REVIEW';
      const cleaned = rawTitle.replace(/ALBUM REVIEW/gi, '').replace(/EP REVIEW/gi, '').trim();
      if (cleaned.includes(' - ')) {
        const parts = cleaned.split(' - ');
        artist = parts[0].trim();
        title = parts.slice(1).join(' - ').trim();
      } else {
        title = cleaned;
      }
    } else {
      itemType = 'roundup';
      itemTypeLabel = 'ROUNDUP 视频盘点';
      itemTypeNote = '视频综合盘点（非单一专辑评分）';
      artist = 'Anthony Fantano';
      title = rawTitle;
    }
  } else if (sourceId === 'stereogum') {
    itemType = 'release';
    itemTypeLabel = 'ALBUM OF THE WEEK';
    const cleaned = rawTitle.replace(/^Album Of The Week:\s*/i, '').replace(/&#8217;/g, "'").trim();
    let found = false;
    for (const a of KNOWN_STEREOGUM_ARTISTS) {
      if (cleaned.toLowerCase().startsWith(a.toLowerCase())) {
        artist = a;
        title = cleaned.slice(a.length).trim();
        found = true;
        break;
      }
    }
    if (!found) {
      const parts = cleaned.split(/\s+/);
      artist = parts.slice(0, 2).join(' ');
      title = parts.slice(2).join(' ') || cleaned;
    }
  } else if (sourceId === 'pitchfork_bnm') {
    itemType = 'release';
    itemTypeLabel = 'PITCHFORK REVIEW';
    artist = getP4kArtist(rawTitle, link);
    title = rawTitle;
  } else if (sourceId === 'bandcamp_daily') {
    const match = rawTitle.match(/^(.*?),\s*[“"'](.*?)[”"']/);
    if (match) {
      itemType = 'release';
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
      artist = m ? m[1].trim() : 'The Quietus';
      title = rawTitle;
    } else if (/Podcast/i.test(rawTitle)) {
      itemType = 'podcast';
      itemTypeLabel = 'PODCAST 声音播客';
      itemTypeNote = '长篇文化对谈播客（不计专辑评分）';
      artist = 'The Quietus Podcast';
      title = rawTitle;
    } else if (rawTitle.includes(' – ') || rawTitle.includes(' - ')) {
      itemType = 'release';
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
  }

  return { artist, title, itemType, itemTypeLabel, itemTypeNote };
}

/**
 * 读取实时缓存并构建全球雷达实体库
 */
export function getEntries() {
  const liveEntries = [];

  if (fs.existsSync(CACHE_FILE)) {
    try {
      const cacheData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
      
      for (const source of cacheData) {
        const sourceDef = SOURCES.find(s => s.id === source.sourceId);
        const resolvedCategory = source.category || sourceDef?.category || 'critical';

        for (const item of (source.items || [])) {
          const { artist, title, itemType, itemTypeLabel, itemTypeNote } = extractArtistAndTitle(item.title, item.link, source.sourceId);
          const genres = inferGenres(item.title, item.description);
          const gradient = getGradientForString(item.title + artist);
          const scores = getScoresForRelease(title, artist, source.sourceId, item.description, itemType);

          const doubanSearchUrl = `https://music.douban.com/subject_search?search_text=${encodeURIComponent(artist + ' ' + title)}`;

          liveEntries.push({
            id: `live-${source.sourceId}-${Buffer.from(item.link).toString('base64url').slice(0, 12)}`,
            title: title,
            artist: artist,
            releaseDate: item.pubDate,
            category: resolvedCategory, // 'avant-garde' | 'underground' | 'critical'
            genres: genres,
            itemType: itemType,
            itemTypeLabel: itemTypeLabel,
            itemTypeNote: itemTypeNote,
            label: source.sourceName,
            coverGradient: gradient,
            coverArt: item.imageUrl || '',
            scores: scores, // Pitchfork, Fantano, RYM, AOTY, 豆瓣 (无伪造分数)
            sources: [
              {
                source: source.badge,
                badge: itemType === 'release' ? 'LIVE DROP' : itemType.toUpperCase(),
                date: item.pubDate,
                note: item.title
              }
            ],
            summary: item.description || `Recent feature from ${source.sourceName}.`,
            audioPreview: '',
            links: {
              original: item.link,
              douban: doubanSearchUrl,
              spotify: `https://open.spotify.com/search/${encodeURIComponent(artist + ' ' + title)}`,
              bandcamp: source.sourceId.includes('bandcamp') ? item.link : `https://bandcamp.com/search?q=${encodeURIComponent(artist + ' ' + title)}`,
              youtube: source.sourceId === 'fantano' ? item.link : `https://www.youtube.com/results?search_query=${encodeURIComponent(artist + ' ' + title)}`
            },
            isHighlight: scores?.pitchfork?.bnm || false,
            isLiveStream: true
          });
        }
      }
    } catch (e) {
      console.warn('⚠️ 读取 live cache 异常:', e);
    }
  }

  // 严格按发布日期 (pubDate) 降序排列
  liveEntries.sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));

  return liveEntries;
}
