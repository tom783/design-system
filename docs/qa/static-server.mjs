// 하네스용 정적 서버 — node 내장 http 만 쓴다(네트워크·npx 의존 없음).
//
//   node docs/qa/static-server.mjs [폴더=storybook-static] [--port 0]
//
// 왜 npx http-server 를 쓰지 않나:
//  - 포트가 차 있으면 http-server 는 조용히 죽고, run-all 은 그 포트에서 응답하는 **남의 서버**를
//    자기 것으로 받아들였다(2026-11-22 실측: 다른 작업 폴더의 6099 를 검사).
//  - npx --yes 는 첫 실행에 레지스트리를 탄다.
// 여기서는 포트가 차 있으면 listen 전에 실패하고(EADDRINUSE 도 즉시 실패), 0 이면 OS 가 빈 포트를 준다.
// 그래도 남의 서버를 볼 가능성은 nonce(storybook-target.mjs)가 마지막으로 막는다.
import { createServer } from 'node:http';
import { connect } from 'node:net';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
  '.avif': 'image/avif', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
  '.wasm': 'application/wasm', '.mp4': 'video/mp4', '.webm': 'video/webm',
};

/**
 * 누가 이미 그 포트에서 듣고 있으면 true. macOS 는 SO_REUSEADDR 때문에 남이 *:6099 를 잡고 있어도
 * 127.0.0.1:6099 bind 가 성공할 수 있다(더 구체적인 주소가 이김). 그래서 bind 전에 접속해 본다.
 */
export function portTaken(port, hosts = ['127.0.0.1', '::1']) {
  return Promise.all(hosts.map((host) => new Promise((done) => {
    const sock = connect({ port, host });
    const finish = (taken) => { sock.destroy(); done(taken); };
    sock.setTimeout(1000, () => finish(false));
    sock.once('connect', () => finish(true));
    sock.once('error', () => finish(false)); // ECONNREFUSED·IPv6 없음 → 비어 있음
  }))).then((r) => r.some(Boolean));
}

/** 정적 파일 응답. 캐시하지 않는다 — nonce 파일을 매번 디스크에서 읽어야 한다. */
export function staticHandler(root) {
  const base = resolve(root);
  return (req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
    let path;
    try { path = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400).end(); return; }
    let file = resolve(join(base, path));
    if (file !== base && !file.startsWith(base + sep)) { res.writeHead(403).end(); return; }
    let st;
    try { st = statSync(file); if (st.isDirectory()) { file = join(file, 'index.html'); st = statSync(file); } }
    catch { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('not found'); return; }
    res.writeHead(200, {
      'content-type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
      'content-length': st.size,
      'cache-control': 'no-store',
    });
    if (req.method === 'HEAD') { res.end(); return; }
    createReadStream(file).on('error', () => res.destroy()).pipe(res);
  };
}

/**
 * 정적 서버를 띄운다. port 0 이면 OS 가 빈 포트를 준다. 지정한 포트가 차 있으면 **즉시 던진다**.
 * 반환: { url, port, close }
 */
export async function startStaticServer({ root, port = 0, host = '127.0.0.1' }) {
  if (!statSync(root, { throwIfNoEntry: false })?.isDirectory()) throw new Error(`정적 서버: 폴더가 없습니다: ${root}`);
  if (port && await portTaken(port)) {
    throw new Error(`정적 서버: 포트 ${port} 를 이미 다른 프로세스가 쓰고 있습니다. 남의 서버를 검사하지 않도록 멈춥니다 ` +
      `(lsof -nP -iTCP:${port} -sTCP:LISTEN 으로 주인을 확인하거나 --port 0).`);
  }
  const server = createServer(staticHandler(root));
  await new Promise((res, rej) => {
    server.once('error', (e) => rej(new Error(`정적 서버: ${host}:${port} 에 띄우지 못했습니다 (${e.code ?? e.message}).`)));
    server.listen({ port, host, exclusive: true }, res);
  });
  const actual = server.address().port;
  const hostPart = host.includes(':') ? `[${host}]` : host;
  return {
    url: `http://${hostPart}:${actual}`,
    port: actual,
    close: () => new Promise((r) => { server.closeAllConnections?.(); server.close(() => r()); }),
  };
}

// 단독 실행: 개발자가 하네스 하나를 손으로 돌릴 때 npx http-server 대신 쓴다.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const pi = args.indexOf('--port');
  const port = pi >= 0 ? Number(args[pi + 1]) : 0;
  const dir = args.find((a, i) => !a.startsWith('--') && (pi < 0 || i !== pi + 1)) ?? 'storybook-static';
  try {
    const s = await startStaticServer({ root: dir, port });
    console.log(`${s.url}  ← ${resolve(dir)}\n  하네스: DS_SB_URL=${s.url} node docs/qa/<하네스>.mjs`);
  } catch (e) { console.error(e.message); process.exit(1); }
}
