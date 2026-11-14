#!/usr/bin/env node
// Deterministic frame-stepping renderer: headless Chromium -> STUDIO.renderFrame(f) -> canvas bytes -> ffmpeg -> MP4.
// Usage: node render.mjs <projectDir> [--out out.mp4] [--from 0] [--to N] [--format png|jpeg] [--crf 16] [--audio mix.wav] [--gpu]
// Needs: npm i playwright && npx playwright install --with-deps chromium ; ffmpeg on PATH. CHROME_PATH=/path/to/chrome to use your own Chrome.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const a = process.argv.slice(2); const dir = path.resolve(a[0] || '.');
const opt = (k, d) => { const i = a.indexOf('--' + k); return i >= 0 ? a[i + 1] : d; };
const out = opt('out', 'out.mp4'), fmt = opt('format', 'png'), crf = opt('crf', '16'), audio = opt('audio', null);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.obj': 'text/plain', '.glb': 'model/gltf-binary', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
const srv = http.createServer((q, r) => { const f = path.join(dir, decodeURIComponent(q.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(dir) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise(r => srv.listen(0, r)); const port = srv.address().port;
const args = a.includes('--gpu') ? ['--enable-gpu-rasterization', '--ignore-gpu-blocklist'] : ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const browser = await chromium.launch({ args, executablePath: process.env.CHROME_PATH || undefined }); const page = await browser.newPage({ viewport: { width: 1200, height: 2000 } });
const errors = []; page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`http://localhost:${port}/index.html?render=1`);
await page.waitForFunction(() => window.STUDIO && window.STUDIO.ready, null, { timeout: 30000 });
const meta = await page.evaluate(async () => { await STUDIO.ready; const c = STUDIO.canvas(); return { w: c.width, h: c.height, fps: STUDIO.fps, dur: STUDIO.duration }; });
const total = Math.round(meta.dur * meta.fps), from = +opt('from', 0), to = +opt('to', total);
console.log(`render ${meta.w}x${meta.h} @${meta.fps} frames ${from}..${to - 1} -> ${out}`);
const ff = ['-y', '-f', 'image2pipe', '-framerate', String(meta.fps), '-i', '-'];
if (audio) ff.push('-ss', String(from / meta.fps), '-i', audio);
// closed GOP, no B-frames, fixed timescale: chunks can be concatenated with -c copy
ff.push('-c:v', 'libx264', '-preset', 'medium', '-crf', crf, '-pix_fmt', 'yuv420p', '-g', String(meta.fps), '-keyint_min', String(meta.fps), '-sc_threshold', '0', '-bf', '0', '-flags', '+cgop', '-video_track_timescale', String(meta.fps * 1000), '-movflags', '+faststart');
if (audio) ff.push('-c:a', 'aac', '-b:a', '320k', '-shortest'); else ff.push('-an');
ff.push(out);
const enc = spawn('ffmpeg', ff, { stdio: ['pipe', 'inherit', 'inherit'] });
const mime = fmt === 'jpeg' ? 'image/jpeg' : 'image/png';
for (let f = from; f < to; f++) {
  const b64 = await page.evaluate(([f, mime]) => { STUDIO.renderFrame(f); return STUDIO.canvas().toDataURL(mime, 0.95).split(',')[1]; }, [f, mime]);
  if (!enc.stdin.write(Buffer.from(b64, 'base64'))) await new Promise(r => enc.stdin.once('drain', r));
  if (f % meta.fps === 0) process.stdout.write(`\r${f}/${to}`);
}
enc.stdin.end(); await new Promise(r => enc.on('close', r));
await browser.close(); srv.close();
if (errors.length) { console.error('\nPAGE ERRORS:\n' + errors.join('\n')); process.exitCode = 2; } else console.log('\ndone, no page errors');
