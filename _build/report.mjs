/**
 * CI 摘要：把 cache.json 的信源健康度渲染成 GitHub Actions Job Summary（Markdown）。
 * 也支持本地直接运行查看。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCache } from './fetch.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

export function buildReport() {
  const cache = readCache();
  const sources = cache.sources || [];
  const live = sources.filter((s) => s.ok !== null);
  const ok = live.filter((s) => s.ok === true);
  const items = sources.reduce((a, s) => a + (s.items?.length || 0), 0);
  const playable = sources.flatMap((s) => s.items || []).filter((i) => i.embedId || i.audioSrc).length;
  const total = (cache.sources || []).reduce((a, s) => a + s.items.length, 0);
  const enriched = Object.keys(cache.enrichment || {}).length;

  let html = '';
  try {
    const h = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');
    html = `${(fs.statSync(path.join(ROOT, 'index.html')).size / 1024).toFixed(1)} KB`;
  } catch { html = '（未构建）'; }

  const rows = sources
    .map((s) => {
      const state = s.ok === true ? '✅' : s.ok === null ? '➖' : '⚠️';
      const detail =
        s.ok === true
          ? `${s.items.length} 条 · ${s.attempts} 次尝试 · ${s.ms ?? '-'}ms`
          : s.status === 'curated'
            ? '无公开订阅接口（策展位）'
            : `${s.error || '失败'} · 沿用 ${s.items.length} 条旧快照`;
      return `| ${state} | ${s.sourceName} | ${detail} |`;
    })
    .join('\n');

  return [
    '## 📡 Sonic Radar 同步报告',
    '',
    `- 快照时间：\`${cache.meta?.updatedAt || 'unknown'}\``,
    `- 信源在线：**${ok.length}/${live.length}**`,
    `- 条目总数：**${total}**（可试听 ${playable} 条）`,
    `- Pitchfork 艺人名精修缓存：${enriched} 条`,
    `- index.html：${html}`,
    '',
    '| 状态 | 信源 | 详情 |',
    '| --- | --- | --- |',
    rows,
    '',
    '> `➖` 表示该信源没有公开订阅接口，仅作策展位保留。',
    '> `⚠️` 表示本轮抓取失败，已保留上次成功快照（不会清空数据）。'
  ].join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(buildReport());
}
