import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getEntries } from './data.mjs';
import { SOURCES } from './sources.mjs';
import { renderPage } from './layout.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const CACHE_FILE = path.join(__dirname, 'cache.json');
const OUTPUT_HTML = path.join(ROOT_DIR, 'index.html');

export function buildSite() {
  console.log('📦 正在构建 Sonic Radar 静态站点...');

  // 读取精选唱片库
  const entries = getEntries();

  // 读取或初始化实时抓取电波流
  let liveStreams = [];
  if (fs.existsSync(CACHE_FILE)) {
    try {
      liveStreams = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    } catch (e) {
      console.warn('⚠️ 读取 cache.json 失败，将使用空流');
    }
  }

  // 渲染最终 HTML
  const htmlContent = renderPage({
    entries,
    liveStreams,
    sources: SOURCES
  });

  fs.writeFileSync(OUTPUT_HTML, htmlContent, 'utf-8');
  const stats = fs.statSync(OUTPUT_HTML);
  console.log(`✅ 构建成功！产物已输出至: ${OUTPUT_HTML} (${(stats.size / 1024).toFixed(1)} KB)`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  buildSite();
}
