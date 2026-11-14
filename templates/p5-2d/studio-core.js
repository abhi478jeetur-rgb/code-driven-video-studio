/* studio-core.js — deterministic helpers shared by every template.
   Contract: window.STUDIO = { width, height, fps, duration, ready:Promise, renderFrame(f), canvas }
   Rule: a frame is a pure function of (seed, f). No Math.random, Date.now, millis, or state carried between frames. */
(function (g) {
  // seeded PRNG (mulberry32). rng(seed) -> () => [0,1)
  function rng(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  // hash noise: same (i, seed) -> same value, no state
  function hash01(i, seed = 1) { let x = (i * 374761393 + seed * 668265263) | 0; x = Math.imul(x ^ (x >>> 13), 1274126177); return ((x ^ (x >>> 16)) >>> 0) / 4294967296; }
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, u) => a + (b - a) * u;
  const PI = Math.PI;
  const Ez = {
    linear: u => u,
    inSine: u => 1 - Math.cos(u * PI / 2), outSine: u => Math.sin(u * PI / 2), inOutSine: u => -(Math.cos(PI * u) - 1) / 2,
    inCubic: u => u * u * u, outCubic: u => 1 - Math.pow(1 - u, 3), inOutCubic: u => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2,
    inExpo: u => u === 0 ? 0 : Math.pow(2, 10 * u - 10), outExpo: u => u === 1 ? 1 : 1 - Math.pow(2, -10 * u),
    inOutExpo: u => u === 0 ? 0 : u === 1 ? 1 : u < .5 ? Math.pow(2, 20 * u - 10) / 2 : (2 - Math.pow(2, -20 * u + 10)) / 2,
    outBack: u => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); },
    outElastic: u => u === 0 ? 0 : u === 1 ? 1 : Math.pow(2, -10 * u) * Math.sin((u * 10 - 0.75) * (2 * PI) / 3) + 1,
    hold: u => 0, step: u => (u < 1 ? 0 : 1)
  };
  // Keyframes: track = [[t, value, ease], ...] sorted by t. value: number or array. ease applies to the segment that ENDS at that key.
  function kf(track, t) {
    if (!track || !track.length) return 0;
    if (t <= track[0][0]) return track[0][1];
    for (let i = 1; i < track.length; i++) {
      const [t1, v1, e] = track[i], [t0, v0] = track[i - 1];
      if (t <= t1) {
        const u = (Ez[e] || Ez.inOutSine)(clamp((t - t0) / Math.max(1e-9, t1 - t0)));
        return Array.isArray(v0) ? v0.map((a, k) => lerp(a, v1[k], u)) : lerp(v0, v1, u);
      }
    }
    return track[track.length - 1][1];
  }
  // progress of t inside [a, a+d]
  const prog = (t, a, d) => clamp((t - a) / d);
  // Timeline: shots = [{start, end, draw(u, t, shot)}]; transitions = [{at, dur, type}]
  function activeShots(shots, t) { return shots.filter(s => t >= s.start && t < s.end); }
  // color helpers
  function hex(h) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function mixColor(a, b, u) { return [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)]; }
  const params = new URLSearchParams(g.location ? g.location.search : '');
  const RENDER_MODE = params.get('render') === '1'; // set by tools/render.mjs: no realtime loop, no recorder
  g.SC = { rng, hash01, clamp, lerp, Ez, kf, prog, activeShots, hex, mixColor, RENDER_MODE };
})(window);
