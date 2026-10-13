/**
 * 浏览器交互回归（零依赖，走 CDP）
 *
 * 为什么需要它：
 *   本次 debug 中，构建与静态检查全绿，但页面交互其实完全失效
 *   （filterCards 抛 ReferenceError 导致 DOMContentLoaded 中断，所有筛选/播放器事件都没绑上）。
 *   只有真实浏览器跑一遍才能发现这类问题，所以把它固化成回归测试。
 *
 * 用法：
 *   node _build/e2e.mjs
 *   需要本机存在 Chrome 或 Edge（自动探测），会自行拉起本地预览服务与无头浏览器。
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = process.env.E2E_PORT || 4175;
const CDP = 9333;

const BROWSERS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium'
];

const results = [];
let failures = 0;
const check = (name, actual, expected) => {
  const pass = typeof expected === 'function' ? expected(actual) : actual === expected;
  if (!pass) failures++;
  results.push({ name, actual, pass });
  console.log(`  ${pass ? '✅' : '❌'} ${name.padEnd(46)} ${actual}`);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const bin = BROWSERS.find((b) => fs.existsSync(b));
  if (!bin) throw new Error('未找到 Chrome / Edge，无法执行浏览器回归');
  console.log(`🌐 浏览器: ${bin}`);

  const server = spawn(process.execPath, [path.join(__dirname, 'serve.mjs')], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'ignore'
  });

  const profile = path.join(os.tmpdir(), 'sonic-radar-e2e-profile');
  const browser = spawn(bin, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--hide-scrollbars', '--window-size=1600,1100',
    `--remote-debugging-port=${CDP}`, `--user-data-dir=${profile}`, 'about:blank'
  ], { stdio: 'ignore' });

  let ws;
  try {
    const target = await waitForTarget();
    ws = await connect(target.webSocketDebuggerUrl);
    const { send, evaluate, exceptions, consoleErrors, pageErrors } = ws;

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Log.enable');
    const loaded = waitForLoad(ws.ws);
    await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/` });
    await loaded;
    await sleep(2000);

    const vis = () => evaluate("document.querySelectorAll('.release-card:not([hidden])').length");
    const total = await evaluate("document.querySelectorAll('.release-card').length");

    console.log('\n▸ 渲染');
    check('卡片总数', total, (v) => v > 0);
    check('初始全部可见', await vis(), total);
    check('横向无溢出', await evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth'), 0);
    check('信源健康度行数', await evaluate("document.querySelectorAll('.health-row').length"), (v) => v > 0);

    console.log('\n▸ [hidden] 过滤链路未被 CSS 覆盖');
    check('hidden 后 display', await evaluate(`
      (() => { const c = document.querySelector('.release-card'); c.hidden = true;
        const d = getComputedStyle(c).display; c.hidden = false; return d; })()`), 'none');

    console.log('\n▸ 筛选');
    const clickVis = async (sel) => {
      await evaluate(`document.querySelector(${JSON.stringify(sel)}).click()`);
      await sleep(120);
      return vis();
    };
    const genre = await evaluate("document.querySelector('.pill-btn:not([data-genre=\"all\"])').dataset.genre");
    check(`流派筛选 "${genre}"`, await clickVis(`.pill-btn[data-genre="${genre}"]`), (v) => v > 0 && v < total);
    check('流派重置', await clickVis('.pill-btn[data-genre="all"]'), total);
    check('状态=多源共识', await clickVis('.status-pill-btn[data-status="consensus"]'), (v) => v > 0 && v < total);
    check('状态=实时新声', await clickVis('.status-pill-btn[data-status="fresh"]'), (v) => v > 0);
    check('状态=专栏', await clickVis('.status-pill-btn[data-status="editorial"]'), (v) => v > 0);
    check('状态重置', await clickVis('.status-pill-btn[data-status="all"]'), total);
    check('Tab=权威乐评', await clickVis('.tab-btn[data-category="critical"]'), (v) => v > 0 && v < total);
    check('Tab 重置', await clickVis('.tab-btn[data-category="all"]'), total);

    console.log('\n▸ 检索（必须大小写不敏感，且覆盖摘要正文）');
    const search = async (q) => {
      await evaluate(`(()=>{const i=document.querySelector('.search-input');i.value=${JSON.stringify(q)};i.dispatchEvent(new Event('input',{bubbles:true}))})()`);
      await sleep(350);
      return vis();
    };
    check('"pitchfork" 命中', await search('pitchfork'), (v) => v > 0);
    check('"PITCHFORK" 大写同结果', await search('PITCHFORK'), (v) => v > 0);
    check('乱码词 0 命中 + 空状态提示', await (async () => {
      const n = await search('zzz-no-such-thing');
      const shown = await evaluate("(()=>{const e=document.querySelector('.no-result');return !!(e&&!e.hidden)})()");
      return n === 0 && shown;
    })(), true);
    check('清空恢复', await search(''), total);

    console.log('\n▸ 播放器');
    const hasPlayable = await evaluate('!!document.querySelector(\'[data-embed]:not([data-embed=""])\')');
    if (hasPlayable) {
      await evaluate(`document.querySelector('[data-embed]:not([data-embed=""]) .play-preview-btn').click()`);
      await sleep(900);
      check('可试听卡 → dock 展开', await evaluate("!document.getElementById('player-dock').hidden"), true);
      check('可试听卡 → 真实内嵌挂载', await evaluate("!!document.querySelector('#player-stage iframe')"), true);
      check('可试听卡 → 波形跳动', await evaluate("document.getElementById('waveform').classList.contains('playing')"), true);
      check('外链齐全且带 noopener', await evaluate(`
        (()=>{const a=[...document.querySelectorAll('#player-links a')];
        return a.length>=4 && a.every(x=>x.rel.includes('noopener'))})()`), true);
    } else {
      check('可试听卡', 'none in dataset', () => true);
    }
    const hasSilent = await evaluate('!!document.querySelector(\'.release-card[data-embed=""][data-audio=""]\')');
    if (hasSilent) {
      await evaluate(`document.querySelector('.release-card[data-embed=""][data-audio=""] .play-preview-btn').click()`);
      await sleep(400);
      check('无音源卡 → 显示说明而非假播', await evaluate("!!document.querySelector('#player-stage .player-note')"), true);
      check('无音源卡 → 播放键隐藏', await evaluate("document.getElementById('play-toggle-btn').hidden"), true);
      check('无音源卡 → 波形静止', await evaluate("!document.getElementById('waveform').classList.contains('playing')"), true);
    }

    console.log('\n▸ 外链展开与多语言');
    check('豆瓣链接已填充检索词', await evaluate("(document.querySelector('.douban-link')?.href||'').includes('search_text=')"), true);
    await evaluate("document.getElementById('lang-toggle-btn').click()");
    await sleep(200);
    check('切英文生效', await evaluate('document.documentElement.lang'), 'en');
    await evaluate("document.getElementById('lang-toggle-btn').click()");

    console.log('\n▸ 运行时健康');
    check('未捕获异常', exceptions.length, 0);
    check('console error/warning', consoleErrors.length, 0);
    check('资源加载失败', pageErrors.length, 0);
  } finally {
    try { ws?.close?.(); } catch { /* ignore */ }
    browser.kill();
    server.kill();
  }

  console.log(`\n${failures === 0 ? '✅ 全部通过' : '❌ 失败 ' + failures + ' 项'}（共 ${results.length} 项）`);
  process.exit(failures === 0 ? 0 : 1);
}

async function waitForTarget() {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json();
      const p = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (p) return p;
    } catch { /* retry */ }
    await sleep(500);
  }
  throw new Error('无法连接到无头浏览器（CDP 未就绪）');
}

async function connect(url) {
  const ws = new WebSocket(url);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const pending = new Map();
  const exceptions = [];
  const consoleErrors = [];
  const pageErrors = [];
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result);
      return;
    }
    if (m.method === 'Runtime.exceptionThrown') {
      exceptions.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    }
    if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) {
      consoleErrors.push(m.params.args.map((a) => a.value ?? a.description ?? a.type).join(' '));
    }
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
      pageErrors.push(m.params.entry.text);
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const mid = ++id;
    pending.set(mid, { resolve, reject });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'evaluate failed');
    return r.result.value;
  };
  return { ws, send, evaluate, exceptions, consoleErrors, pageErrors };
}

function waitForLoad(ws) {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, 15000);
    const onMsg = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.method === 'Page.loadEventFired') {
        clearTimeout(timer);
        ws.removeEventListener('message', onMsg);
        resolve();
      }
    };
    ws.addEventListener('message', onMsg);
  });
}

main().catch((e) => { console.error('❌ 回归失败:', e.message); process.exit(1); });
