import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOURCES, FETCH_POLICY } from './sources.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_FILE = path.join(__dirname, 'cache.json');

const CACHE_VERSION = 2;

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.7',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache'
};

/* ------------------------------------------------------------------ *
 * 文本解码：RSS/Atom 中实体编码不完整是内容乱码的头号来源
 * ------------------------------------------------------------------ */

const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0',
  hellip: '\u2026', mdash: '\u2014', ndash: '\u2013', lsquo: '\u2018',
  rsquo: '\u2019', ldquo: '\u201c', rdquo: '\u201d', bull: '\u2022',
  middot: '\u00b7', times: '\u00d7', eacute: '\u00e9', egrave: '\u00e8',
  ouml: '\u00f6', uuml: '\u00fc', auml: '\u00e4', aacute: '\u00e1',
  iacute: '\u00ed', oacute: '\u00f3', uacute: '\u00fa', ntildp: '\u00f1',
  ntilde: '\u00f1', ccedil: '\u00e7', aring: '\u00e5', oslash: '\u00f8',
  szlig: '\u00df', deg: '\u00b0', copy: '\u00a9', reg: '\u00ae',
  trade: '\u2122', euro: '\u20ac', pound: '\u00a3', yen: '\u00a5'
};

/** 完整解码 HTML 实体：命名实体 + 十进制 &#8217; + 十六进制 &#x2019; */
export function decodeEntities(input = '') {
  if (!input) return '';
  return String(input)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => safeCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => safeCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m);
}

function safeCodePoint(code) {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return '';
  try {
    return String.fromCodePoint(code);
  } catch {
    return '';
  }
}

/** 去标签 + 解码实体 + 折叠空白（顺序很重要：先去标签再解码，避免解码出新的标签） */
export function stripHtml(input = '') {
  return decodeEntities(String(input).replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

/* ------------------------------------------------------------------ *
 * 日期解析：一条坏日期曾经会抛异常并整源丢弃
 * ------------------------------------------------------------------ */

export function parsePubDate(raw, fallback = null) {
  if (!raw) return fallback;
  const d = new Date(String(raw).trim());
  if (Number.isNaN(d.getTime())) return fallback;
  // 拒绝明显异常的日期（时区/年份解析错误）
  const y = d.getUTCFullYear();
  if (y < 2000 || y > 2100) return fallback;
  return d.toISOString().slice(0, 10);
}

const today = () => new Date().toISOString().slice(0, 10);

/* ------------------------------------------------------------------ *
 * 零依赖 RSS / Atom 解析器
 * ------------------------------------------------------------------ */

export function parseRssXml(xmlString, sourceId = '') {
  const blocks = xmlString.match(/<item[\s\S]*?<\/item>/gi) || xmlString.match(/<entry[\s\S]*?<\/entry>/gi) || [];
  const items = [];

  for (const block of blocks) {
    const getTag = (...tags) => {
      for (const tag of tags) {
        const re = new RegExp(`<${tag.replace(':', '\\:')}[^>]*>([\\s\\S]*?)<\\/${tag.replace(':', '\\:')}>`, 'i');
        const m = block.match(re);
        if (m) return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1').trim();
      }
      return '';
    };
    const attr = (tag, name) => (block.match(new RegExp(`<${tag}[^>]*\\s${name}=["']([^"']+)["']`, 'i')) || [])[1] || '';

    const getLink = () => {
      const href = block.match(/<link[^>]+rel=["']alternate["'][^>]*href=["']([^"']+)["']/i)
        || block.match(/<link[^>]+href=["']([^"']+)["']/i);
      if (href) return href[1];
      return stripHtml(getTag('link'));
    };

    // 出版方自带的标签体系（价值远高于正文关键词推断）
    //  - Bandcamp Daily 的 <category> 直接是流派（Best Jazz / Best Electronic / Best Country …）
    //  - Stereogum 的 <category> 直接包含艺人名（Sophia Stel / Cameron Winter …）
    // 注意：Stereogum 的 category 是 CDATA 包裹的，必须先剥 CDATA 再 stripHtml，
    //       否则 <![CDATA[...]]> 会被 stripHtml 当作 HTML 标签整块删除（历史 bug）。
    const categories = [...block.matchAll(/<category[^>]*>([\s\S]*?)<\/category>/gi)]
      .map((m) => stripHtml(m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')))
      .filter(Boolean);

    const description = stripHtml(getTag('content:encoded', 'content', 'description', 'summary', 'media:description'));
    const ytId = stripHtml(getTag('yt:videoId')) || (getLink().match(/[?&]v=([A-Za-z0-9_-]{11})/) || [])[1] || '';

    // 封面 / 音源解析（按可靠度排序）
    let imageUrl = attr('media:thumbnail', 'url') || attr('media:content', 'url') || attr('enclosure', 'url') || '';
    if (!imageUrl && /^https?:/.test(imageUrl)) imageUrl = '';
    if (!imageUrl && ytId) imageUrl = `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
    if (!imageUrl) {
      const encType = attr('enclosure', 'type');
      if (encType.startsWith('image/')) imageUrl = attr('enclosure', 'url');
    }
    if (!imageUrl) {
      const imgTags = block.match(/<img[^>]+src=["']([^"']+)["']/gi) || [];
      for (const t of imgTags) {
        const src = (t.match(/src=["']([^"']+)["']/) || [])[1] || '';
        // 跳过广告/像素追踪图
        if (/^https?:/.test(src) && !/feedburner|feeds\.|pixel|1x1|spacer|doubleclick|stat\./i.test(src)) {
          imageUrl = src;
          break;
        }
      }
    }
    // Protocol-relative 与相对路径统一为 https
    if (imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl;

    const enclosureType = attr('enclosure', 'type');
    const audioSrc = enclosureType.startsWith('audio/') ? attr('enclosure', 'url') : '';

    const rawTitle = getTag('title');
    if (!rawTitle) continue;

    items.push({
      title: stripHtml(rawTitle),
      link: getLink(),
      imageUrl,
      // 真实可播放音源：YouTube 视频 -> iframe 内嵌；RSS 音频 enclosure -> <audio>
      embedId: ytId,
      audioSrc,
      pubDate: parsePubDate(getTag('pubDate', 'published', 'updated', 'dc:date')),
      description,
      categories,
      author: stripHtml(getTag('dc:creator', 'author'))
    });
  }

  // 二次兜底：若源内所有 pubDate 都缺失，用今天
  for (const it of items) if (!it.pubDate) it.pubDate = today();

  return items.slice(0, FETCH_POLICY.itemLimit);
}

/* ------------------------------------------------------------------ *
 * 带重试的抓取
 * ------------------------------------------------------------------ */

async function fetchWithRetry(url, { retries = FETCH_POLICY.retries, timeoutMs = FETCH_POLICY.timeoutMs, accept } = {}) {
  let lastErr;
  let attempts = 0;
  const headers = accept ? { ...BROWSER_HEADERS, Accept: accept } : BROWSER_HEADERS;
  for (let i = 0; i <= retries; i++) {
    attempts = i + 1;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { headers, signal: controller.signal, redirect: 'follow' });
      clearTimeout(timer);
      // 确定性失败：不再重试（403 是 WAF，404 是地址失效）
      if (res.status === 403 || res.status === 404 || res.status === 410) {
        return { attempts, status: res.status, text: '', permanent: true };
      }
      // 可重试状态
      if (res.status === 429 || res.status >= 500) {
        const body = await res.text().catch(() => '');
        lastErr = new Error(`HTTP ${res.status}`);
        if (i === retries) return { attempts, status: res.status, text: body, permanent: false };
        await sleep(FETCH_POLICY.backoffMs * 2 ** i);
        continue;
      }
      const text = await res.text();
      return { attempts, status: res.status, text, permanent: false };
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (i === retries) break;
      await sleep(FETCH_POLICY.backoffMs * 2 ** i);
    }
  }
  throw new Error(`${lastErr?.message || 'fetch failed'} (已重试 ${attempts} 次)`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ *
 * 缓存读写：合并式 + 原子写入
 * ------------------------------------------------------------------ */

export function readCache() {
  if (!fs.existsSync(CACHE_FILE)) return { meta: { version: CACHE_VERSION }, sources: [] };
  try {
    const raw = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    // 兼容 v1（裸数组）与 v2（对象）两种结构
    if (Array.isArray(raw)) return { meta: { version: 1 }, sources: raw };
    if (raw && Array.isArray(raw.sources)) return raw;
    return { meta: { version: CACHE_VERSION }, sources: [] };
  } catch (e) {
    console.warn('⚠️  cache.json 解析失败，将以空缓存继续（旧文件保持不动）:', e.message);
    return { meta: { version: CACHE_VERSION }, sources: [] };
  }
}

function writeCacheAtomic(data) {
  const tmp = CACHE_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmp, CACHE_FILE);
}

/* ------------------------------------------------------------------ *
 * Pitchfork 艺人名精修
 *
 * 问题：Pitchfork 的 RSS 只给专辑名，艺人在 URL slug 里且与专辑名无分隔符。
 *   例：标题 "The Bone" + slug "greg-freeman-all-set-the-bone"
 *       → 纯字符串算法会切出「Greg Freeman All Set」这种不存在的艺人。
 * 方案：抓取评论页的 og:title（权威格式 "<Artist>: <Album>"）做精修，
 *       并把结果按链接缓存，之后只对新增链接发起请求。
 * ------------------------------------------------------------------ */

async function enrichPitchforkArtists(items, prevEnrichment) {
  const enrichment = { ...prevEnrichment };
  const pending = items.find((s) => s.sourceId === 'pitchfork_bnm')?.items || [];
  const todo = pending
    .map((i) => i.link)
    .filter((l) => l && !enrichment[l])
    .slice(0, FETCH_POLICY.enrichLimit);

  if (!todo.length) return enrichment;

  console.log(`🔎 [ENRICH] 精修 ${todo.length} 条 Pitchfork 艺人名（og:title，并发 ${FETCH_POLICY.enrichConcurrency}）`);
  let cursor = 0;
  let ok = 0;
  const worker = async () => {
    while (cursor < todo.length) {
      const link = todo[cursor++];
      try {
        const { status, text } = await fetchWithRetry(link, {
          retries: 1,
          timeoutMs: 12000,
          accept: 'text/html,application/xhtml+xml'
        });
        if (status !== 200) continue;
        const og = (text.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i) || [])[1];
        if (!og) continue;
        const sep = og.indexOf(': ');
        if (sep <= 0) continue;
        const artist = decodeEntities(og.slice(0, sep)).trim();
        const album = decodeEntities(og.slice(sep + 2)).trim();
        if (!artist || !album) continue;
        enrichment[link] = { artist, album };
        ok++;
      } catch { /* 单条精修失败不影响主流程；下一轮会重试（未写入缓存） */ }
    }
  };
  await Promise.all(Array.from({ length: Math.min(FETCH_POLICY.enrichConcurrency, todo.length) }, worker));
  console.log(`🔎 [ENRICH] 完成 ${ok}/${todo.length} 条，累计缓存 ${Object.keys(enrichment).length} 条`);
  return enrichment;
}

/* ------------------------------------------------------------------ *
 * 主流程
 * ------------------------------------------------------------------ */

export async function fetchAllFeeds() {
  const prev = readCache();
  const prevBySource = new Map(prev.sources.map((s) => [s.sourceId, s]));

  console.log(`⚡ 开始同步 ${SOURCES.length} 路信源（并发 ${SOURCES.length}，超时 ${FETCH_POLICY.timeoutMs}ms，重试 ${FETCH_POLICY.retries} 次）`);

  const results = await Promise.allSettled(
    SOURCES.map(async (source) => {
      if (!source.feedUrl) return { source, skipped: true };
      const t0 = Date.now();
      const { attempts, status, text, permanent } = await fetchWithRetry(source.feedUrl);
      const items = status === 200 ? parseRssXml(text, source.id) : [];
      return { source, attempts, status, permanent, items, ms: Date.now() - t0 };
    })
  );

  const nowIso = new Date().toISOString();
  const merged = [];

  for (let i = 0; i < SOURCES.length; i++) {
    const source = SOURCES[i];
    const r = results[i];
    const old = prevBySource.get(source.id);
    const oldItems = old?.items || [];

    const base = {
      sourceId: source.id,
      sourceName: source.name,
      badge: source.badge,
      category: source.category,
      color: source.color,
      tier: source.tier,
      description: source.description,
      homeUrl: source.url,
      curatedOnly: !!source.curatedOnly
    };

    // 无订阅接口的策展位：不做网络请求，保留历史数据（若有）
    if (r.status === 'fulfilled' && r.value.skipped) {
      merged.push({
        ...base,
        ok: null,
        status: 'curated',
        httpStatus: null,
        error: source.note || '该信源无公开订阅接口',
        fetchedAt: old?.fetchedAt || null,
        lastOkAt: old?.lastOkAt || null,
        itemCount: oldItems.length,
        items: oldItems
      });
      console.log(`ℹ️  [CURATED] ${source.name}: 无订阅接口，保留历史快照 ${oldItems.length} 条`);
      continue;
    }

    // 网络层彻底失败
    if (r.status === 'rejected') {
      merged.push({
        ...base,
        ok: false,
        status: 'error',
        httpStatus: null,
        error: r.reason?.message || 'fetch failed',
        fetchedAt: old?.fetchedAt || null,
        lastOkAt: old?.lastOkAt || null,
        itemCount: oldItems.length,
        items: oldItems
      });
      console.warn(`⚠️  [ERROR] ${source.name}: ${r.reason?.message} → 保留上次快照 ${oldItems.length} 条`);
      continue;
    }

    const { status, items, attempts, permanent, ms } = r.value;

    // 有响应但内容不可用：保留旧数据，绝不把好数据洗掉
    if (status !== 200 || items.length === 0) {
      merged.push({
        ...base,
        ok: false,
        status: status !== 200 ? 'http-' + status : 'empty',
        httpStatus: status,
        attempts,
        error:
          status === 403
            ? `HTTP 403（源站防护拦截${source.waf ? ' · ' + source.waf : ''}）`
            : status !== 200
              ? `HTTP ${status}`
              : '响应 200 但未解析出条目',
        fetchedAt: old?.fetchedAt || null,
        lastOkAt: old?.lastOkAt || null,
        itemCount: oldItems.length,
        items: oldItems
      });
      console.warn(`⚠️  [KEEP] ${source.name}: HTTP ${status} → 保留上次快照 ${oldItems.length} 条${permanent ? '（确定性失败，未重试）' : ''}`);
      continue;
    }

    const withCover = items.filter((x) => x.imageUrl).length;
    const playable = items.filter((x) => x.embedId || x.audioSrc).length;
    merged.push({
      ...base,
      ok: true,
      status: 'ok',
      httpStatus: status,
      attempts,
      ms,
      error: null,
      fetchedAt: nowIso,
      lastOkAt: nowIso,
      itemCount: items.length,
      items
    });
    console.log(`✅ [OK] ${source.name}: ${items.length} 条 · 封面 ${withCover} · 可试听 ${playable} · ${attempts} 次尝试 · ${ms}ms`);
  }

  const payload = {
    meta: {
      version: CACHE_VERSION,
      updatedAt: nowIso,
      policy: FETCH_POLICY,
      okSources: merged.filter((s) => s.ok === true).length,
      totalSources: merged.filter((s) => s.ok !== null).length
    },
    sources: merged
  };

  // Pitchfork 艺人名精修（带跨轮缓存，仅新链接产生网络开销）
  const enrichment = await enrichPitchforkArtists(merged, prev.enrichment || {});
  // 只保留仍在使用中的链接，避免缓存无限膨胀
  const liveLinks = new Set(merged.flatMap((s) => (s.items || []).map((i) => i.link)));
  payload.enrichment = Object.fromEntries(
    Object.entries(enrichment).filter(([k]) => liveLinks.has(k)).slice(0, 600)
  );

  const totalItems = merged.reduce((a, s) => a + s.items.length, 0);
  const prevTotal = prev.sources.reduce((a, s) => a + (s.items?.length || 0), 0);
  if (totalItems < prevTotal) {
    console.warn(`⚠️  条目总数由上轮的 ${prevTotal} 变为 ${totalItems}（因合并策略，仅当信源主动缩量时才会下降）`);
  }

  writeCacheAtomic(payload);
  console.log(`🎉 同步完成：${merged.filter((s) => s.ok === true).length}/${merged.filter((s) => s.ok !== null).length} 路实时源可用，累计 ${totalItems} 条 → ${CACHE_FILE}`);
  return payload;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  fetchAllFeeds().catch((err) => {
    console.error('Fetch failed:', err);
    process.exit(1);
  });
}
