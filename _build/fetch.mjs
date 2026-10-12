import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOURCES } from './sources.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_FILE = path.join(__dirname, 'cache.json');

/**
 * 极简零依赖 RSS XML 解析器 (原生正则流式抽取)
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

    const title = getTag('title');
    const link = getLink();
    const pubDate = getTag('pubDate') || getTag('published') || getTag('updated');
    const description = getTag('description') || getTag('content');

    if (title) {
      items.push({
        title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
        link,
        pubDate: pubDate ? new Date(pubDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        description: description.replace(/<[^>]+>/g, '').slice(0, 150)
      });
    }
  }

  return items;
}

export async function fetchAllFeeds() {
  console.log('⚡ 开始同步各路信源 (Pitchfork / Bandcamp / The Wire / StreetVoice / FMA)...');
  const results = [];

  for (const source of SOURCES) {
    if (!source.feedUrl) continue;
    try {
      console.log(`📡 [FETCHING] ${source.name} -> ${source.feedUrl}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

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
      console.log(`✅ [SUCCESS] ${source.name}: 捕获到 ${parsedItems.length} 条记录`);

      results.push({
        sourceId: source.id,
        sourceName: source.name,
        badge: source.badge,
        category: source.region,
        color: source.color,
        items: parsedItems.slice(0, 5)
      });
    } catch (err) {
      console.warn(`⚠️ [TIMEOUT/SKIP] ${source.name}: ${err.message}`);
    }
  }

  // 写入本地缓存文件
  fs.writeFileSync(CACHE_FILE, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`🎉 同步完成！缓存已持久化至: ${CACHE_FILE}`);
  return results;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  fetchAllFeeds().catch(err => {
    console.error('Fetch failed:', err);
    process.exit(1);
  });
}
