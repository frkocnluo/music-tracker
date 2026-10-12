import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOURCES } from './sources.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_FILE = path.join(__dirname, 'cache.json');

/**
 * 零依赖 RSS/Atom 解析器 (包含高清封面提取)
 */
function parseRssXml(xmlString) {
  const items = [];
  const itemMatches = xmlString.match(/<item[\s\S]*?<\/item>/gi) || xmlString.match(/<entry[\s\S]*?<\/entry>/gi) || [];

  for (const block of itemMatches) {
    const getTag = (tag) => {
      const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
      if (!match) return '';
      return match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1').trim();
    };

    const getLink = () => {
      const hrefMatch = block.match(/<link[^>]+href=["']([^"']+)["']/i);
      if (hrefMatch) return hrefMatch[1];
      return getTag('link');
    };

    // 智能提取专辑封面图 / 视频缩略图
    const getImageUrl = () => {
      // 1. YouTube videoId 或 thumbnail
      const ytThumb = block.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i);
      if (ytThumb) return ytThumb[1];
      const ytId = block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/i) || block.match(/watch\?v=([a-zA-Z0-9_-]{11})/i);
      if (ytId) return `https://i.ytimg.com/vi/${ytId[1]}/hqdefault.jpg`;

      // 2. media:content 或 media:thumbnail
      const mediaMatch = block.match(/<media:(?:content|thumbnail)[^>]+url=["']([^"']+)["']/i);
      if (mediaMatch) return mediaMatch[1];

      // 3. enclosure 附件
      const encMatch = block.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
      if (encMatch) return encMatch[1];

      // 4. 正文中的 img src
      const imgMatch = block.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgMatch) return imgMatch[1];

      return '';
    };

    const title = getTag('title');
    const link = getLink();
    const pubDate = getTag('pubDate') || getTag('published') || getTag('updated');
    const description = getTag('description') || getTag('content');
    const imageUrl = getImageUrl();

    if (title) {
      items.push({
        title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
        link,
        imageUrl,
        pubDate: pubDate ? new Date(pubDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        description: description.replace(/<[^>]+>/g, '').slice(0, 150)
      });
    }
  }

  return items;
}

export async function fetchAllFeeds() {
  console.log('⚡ 开始同步各路信源与官方专辑封面 (Pitchfork / Bandcamp / The Wire / StreetVoice / FMA)...');
  const results = [];

  for (const source of SOURCES) {
    if (!source.feedUrl) continue;
    try {
      console.log(`📡 [FETCHING] ${source.name} -> ${source.feedUrl}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(source.feedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SonicRadar/1.0'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        console.warn(`⚠️ [SKIP] ${source.name} HTTP ${res.status}`);
        continue;
      }

      const text = await res.text();
      const parsedItems = parseRssXml(text);
      const itemsWithImg = parsedItems.filter(i => !!i.imageUrl).length;
      console.log(`✅ [SUCCESS] ${source.name}: 捕获到 ${parsedItems.length} 条记录 (包含封面: ${itemsWithImg} 条)`);

      results.push({
        sourceId: source.id,
        sourceName: source.name,
        badge: source.badge,
        category: source.region,
        color: source.color,
        items: parsedItems.slice(0, 25)
      });
    } catch (err) {
      console.warn(`⚠️ [TIMEOUT/SKIP] ${source.name}: ${err.message}`);
    }
  }

  // 写入本地缓存文件
  fs.writeFileSync(CACHE_FILE, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`🎉 同步完成！封面与数据已持久化至: ${CACHE_FILE}`);
  return results;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  fetchAllFeeds().catch(err => {
    console.error('Fetch failed:', err);
    process.exit(1);
  });
}
