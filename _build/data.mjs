import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

/**
 * 从信源标题中清洗出 Artist 与 Title
 */
function extractArtistAndTitle(rawTitle, link, sourceId) {
  let artist = 'Independent Artist';
  let title = rawTitle;

  if (sourceId === 'fantano') {
    // e.g. "Swans - Newly Sentient Being ALBUM REVIEW"
    const cleaned = rawTitle.replace(/ALBUM REVIEW/gi, '').replace(/EP REVIEW/gi, '').trim();
    if (cleaned.includes(' - ')) {
      const parts = cleaned.split(' - ');
      artist = parts[0].trim();
      title = parts.slice(1).join(' - ').trim();
    }
  } else if (sourceId === 'thequietus') {
    // e.g. "Gnod – Chronicles of Gnowt Vol. 2"
    if (rawTitle.includes(' – ')) {
      const parts = rawTitle.split(' – ');
      artist = parts[0].trim();
      title = parts.slice(1).join(' – ').trim();
    } else if (rawTitle.includes(' - ')) {
      const parts = rawTitle.split(' - ');
      artist = parts[0].trim();
      title = parts.slice(1).join(' - ').trim();
    }
  } else if (sourceId === 'bandcamp_daily') {
    // e.g. "Karen y los Remedios, “Bestiaria”"
    const match = rawTitle.match(/^(.*?),\s*[“"'](.*?)[”"']/);
    if (match) {
      artist = match[1].trim();
      title = match[2].trim();
    }
  } else if (sourceId === 'stereogum') {
    // e.g. "Album Of The Week: The Smile Cutouts"
    const cleaned = rawTitle.replace(/^Album Of The Week:\s*/i, '').trim();
    title = cleaned;
    const parts = cleaned.split(/\s+/);
    if (parts.length >= 2) {
      artist = parts[0];
    }
  } else if (sourceId === 'pitchfork_bnm') {
    // Pitchfork review URL has slug: /reviews/albums/marina-herlop-dja-dja/
    const urlMatch = link.match(/\/reviews\/albums\/([^/]+)\/?$/);
    if (urlMatch) {
      const slug = urlMatch[1];
      const parts = slug.split('-');
      title = rawTitle;
      if (parts.length >= 2) {
        artist = parts.slice(0, Math.floor(parts.length / 2)).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
    }
  }

  return { artist, title };
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
        for (const item of (source.items || [])) {
          const { artist, title } = extractArtistAndTitle(item.title, item.link, source.sourceId);
          const genres = inferGenres(item.title, item.description);
          const gradient = getGradientForString(item.title + artist);

          liveEntries.push({
            id: `live-${source.sourceId}-${Buffer.from(item.link).toString('base64url').slice(0, 12)}`,
            title: title,
            artist: artist,
            releaseDate: item.pubDate,
            category: source.category, // 'avant-garde' | 'underground' | 'critical'
            genres: genres,
            label: source.sourceName,
            coverGradient: gradient,
            coverArt: item.imageUrl || '',
            sources: [
              {
                source: source.badge,
                badge: 'LIVE DROP',
                date: item.pubDate,
                note: item.title
              }
            ],
            summary: item.description || `Recent feature from ${source.sourceName}.`,
            audioPreview: '',
            links: {
              original: item.link,
              spotify: `https://open.spotify.com/search/${encodeURIComponent(artist + ' ' + title)}`,
              bandcamp: source.sourceId.includes('bandcamp') ? item.link : `https://bandcamp.com/search?q=${encodeURIComponent(artist + ' ' + title)}`,
              youtube: source.sourceId === 'fantano' ? item.link : `https://www.youtube.com/results?search_query=${encodeURIComponent(artist + ' ' + title)}`
            },
            isHighlight: true,
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
