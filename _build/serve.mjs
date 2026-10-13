import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const PORT = process.env.PORT || 4174;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon'
};

const COMPRESSIBLE = /^(text\/|application\/(javascript|json|xml))/;

/**
 * 把请求路径解析为 ROOT_DIR 内的真实文件路径。
 *
 * 安全修复：旧实现是 path.join(ROOT_DIR, decodeURI(req.url))，
 * 未做归属校验，导致 `GET /../../.workbuddy/user-xxx/USER.md` 可直接读到项目外文件
 * （实测 HTTP 200 + 真实内容）。此处改为「解码 → 归一化 → 前缀校验」。
 */
export function resolveSafePath(rawUrl) {
  let pathname = String(rawUrl || '/').split('?')[0].split('#')[0];

  // 逐段解码，避免 decodeURI 不处理 %2f 造成的二次绕过
  try {
    pathname = pathname
      .split('/')
      .map((seg) => {
        try { return decodeURIComponent(seg); } catch { return seg; }
      })
      .join('/');
  } catch { /* 保持原串 */ }

  if (pathname === '/' || pathname === '') pathname = '/index.html';

  // 归一化后与根目录比对（Windows 下大小写不敏感，统一小写比较）
  const resolved = path.resolve(ROOT_DIR, '.' + path.posix.normalize(pathname));
  const rootWithSep = ROOT_DIR.endsWith(path.sep) ? ROOT_DIR : ROOT_DIR + path.sep;
  const lower = resolved.toLowerCase();
  if (lower !== ROOT_DIR.toLowerCase() && !lower.startsWith(rootWithSep.toLowerCase())) return null;

  return resolved;
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8', Allow: 'GET, HEAD' });
    res.end('405 Method Not Allowed');
    return;
  }

  const filePath = resolveSafePath(req.url);
  if (filePath === null) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const type = MIME_TYPES[ext] || 'application/octet-stream';
    const headers = {
      'Content-Type': type,
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff'
    };

    const acceptEncoding = String(req.headers['accept-encoding'] || '');
    const canGzip = COMPRESSIBLE.test(type) && stat.size > 1400 && /\bgzip\b/.test(acceptEncoding);

    // 注意：不能把 Content-Length 设为 undefined —— writeHead 会写出字面量
    // "Content-Length: undefined"，导致客户端拿不到正确的响应长度。
    const outHeaders = { ...headers };
    if (canGzip) {
      outHeaders['Content-Encoding'] = 'gzip';
      outHeaders.Vary = 'Accept-Encoding';
    } else {
      outHeaders['Content-Length'] = stat.size;
    }
    res.writeHead(200, outHeaders);

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    const stream = fs.createReadStream(filePath);
    if (canGzip) {
      stream.pipe(zlib.createGzip({ level: 6 })).pipe(res);
    } else {
      stream.pipe(res);
    }
  });
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`📡 Sonic Radar 本地预览服务已启动: http://127.0.0.1:${PORT}`);
    console.log(`   根目录: ${ROOT_DIR}`);
  });
}

export { server };
