/* text line detector, settings in text_detector_config.json */
(function () {
    const DEFAULTS = {
        modelUrl: 'assets/models/text_detector.onnx',
        configUrl: 'assets/models/text_detector_config.json',
        shortSides: [512, 768],
        maxLongSide: 1600,
        maxUpscale: 1.5,
        threshold: 0.5,
        minScore: 0.6,
        minCoreHeight: 2,
        minCorePixels: 6,
        mergeGapRatio: 1.0,
        expand: 0.5,
        nmsIou: 0.4,
        nmsContainment: 0.8
    };

    /* ---- boxes from the core map ---- */

    function findCores(prob, w, h, cfg) {
        const n = w * h;
        const seen = new Uint8Array(n);
        const stack = new Int32Array(n);
        const cores = [];
        for (let start = 0; start < n; start++) {
            if (seen[start] || !(prob[start] > cfg.threshold)) continue;
            let top = 0;
            stack[top++] = start;
            seen[start] = 1;
            let minX = w, minY = h, maxX = -1, maxY = -1, count = 0, sum = 0;
            while (top > 0) {
                const p = stack[--top];
                const y = (p / w) | 0;
                const x = p - y * w;
                count++;
                sum += prob[p];
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
                for (let dy = -1; dy <= 1; dy++) {
                    const yy = y + dy;
                    if (yy < 0 || yy >= h) continue;
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        const xx = x + dx;
                        if (xx < 0 || xx >= w) continue;
                        const q = yy * w + xx;
                        if (!seen[q] && prob[q] > cfg.threshold) {
                            seen[q] = 1;
                            stack[top++] = q;
                        }
                    }
                }
            }
            const score = sum / count;
            if (maxY - minY + 1 >= cfg.minCoreHeight && count >= cfg.minCorePixels && score >= cfg.minScore) {
                cores.push([minX, minY, maxX + 1, maxY + 1, score]);
            }
        }
        return cores;
    }

    // merge cores on the same line (same height, small gap)
    function mergeCores(cores, gapRatio) {
        const c = cores.map(x => x.slice());
        let merged = true;
        while (merged) {
            merged = false;
            for (let i = 0; i < c.length && !merged; i++) {
                for (let j = i + 1; j < c.length; j++) {
                    const a = c[i], b = c[j];
                    const ha = a[3] - a[1], hb = b[3] - b[1];
                    const sameLine = Math.min(a[3], b[3]) - Math.max(a[1], b[1]) >= 0.7 * Math.min(ha, hb) &&
                        Math.max(ha, hb) <= 1.6 * Math.min(ha, hb);
                    if (sameLine && Math.max(a[0], b[0]) - Math.min(a[2], b[2]) <= gapRatio * Math.max(ha, hb)) {
                        c[i] = [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3]), Math.max(a[4], b[4])];
                        c.splice(j, 1);
                        merged = true;
                        break;
                    }
                }
            }
        }
        return c;
    }

    function boxesFromMap(prob, w, h, cfg) {
        const out = [];
        for (const [x0, y0, x1, y1, s] of mergeCores(findCores(prob, w, h, cfg), cfg.mergeGapRatio)) {
            const e = cfg.expand * (y1 - y0);
            out.push([Math.max(0, x0 - e), Math.max(0, y0 - e), Math.min(w, x1 + e), Math.min(h, y1 + e), s]);
        }
        return out;
    }

    function iou(a, b) {
        const iw = Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0]));
        const ih = Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
        const inter = iw * ih;
        const union = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter;
        return union > 0 ? inter / union : 0;
    }

    // keep the best box of each overlapping group
    function nms(boxes, iouThr, containThr) {
        const keep = [];
        const sorted = boxes.slice().sort((a, b) => b[4] - a[4]);
        for (const b of sorted) {
            const area = Math.max(1e-6, (b[2] - b[0]) * (b[3] - b[1]));
            let dup = false;
            for (const k of keep) {
                const iw = Math.max(0, Math.min(b[2], k[2]) - Math.max(b[0], k[0]));
                const ih = Math.max(0, Math.min(b[3], k[3]) - Math.max(b[1], k[1]));
                if (iou(b, k) >= iouThr || (iw * ih) / area >= containThr) { dup = true; break; }
            }
            if (!dup) keep.push(b);
        }
        return keep;
    }

    function pickScales(w, h, cfg) {
        const scales = [];
        for (const ss of cfg.shortSides) {
            const s = Math.min(ss / Math.min(w, h), cfg.maxLongSide / Math.max(w, h), cfg.maxUpscale);
            if (!scales.some(t => Math.abs(t - s) / s < 0.1)) scales.push(s);
        }
        return scales;
    }

    /* ---- model and canvas ---- */

    let cfgPromise = null;
    let sessionPromise = null;

    function loadConfig() {
        if (!cfgPromise) {
            cfgPromise = fetch(DEFAULTS.configUrl)
                .then(r => (r.ok ? r.json() : {}))
                .catch(() => ({}))
                .then(j => ({
                    ...DEFAULTS,
                    shortSides: j.short_sides || DEFAULTS.shortSides,
                    maxLongSide: j.max_long_side || DEFAULTS.maxLongSide,
                    threshold: j.threshold ?? DEFAULTS.threshold,
                    minScore: j.min_score ?? DEFAULTS.minScore,
                    minCoreHeight: j.min_core_height ?? DEFAULTS.minCoreHeight,
                    minCorePixels: j.min_core_pixels ?? DEFAULTS.minCorePixels,
                    mergeGapRatio: j.merge_gap_ratio ?? DEFAULTS.mergeGapRatio,
                    expand: j.expand ?? DEFAULTS.expand,
                    nmsIou: j.nms_iou ?? DEFAULTS.nmsIou,
                    nmsContainment: j.nms_containment ?? DEFAULTS.nmsContainment
                }));
        }
        return cfgPromise;
    }

    function loadSession() {
        if (!sessionPromise) {
            // wasm only, it is what the model was tested with
            sessionPromise = ort.InferenceSession.create(DEFAULTS.modelUrl, { executionProviders: ['wasm'] }).catch(err => {
                sessionPromise = null;
                throw err;
            });
        }
        return sessionPromise;
    }

    function scaledCanvas(src, w, h) {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(src, 0, 0, src.width, src.height, 0, 0, w, h);
        return c;
    }

    // halve step by step, one big jump aliases thin glyphs
    function resizeCanvas(src, nw, nh) {
        let cur = src;
        while (cur.width >= nw * 2 && cur.height >= nh * 2) {
            cur = scaledCanvas(cur, Math.max(nw, Math.ceil(cur.width / 2)), Math.max(nh, Math.ceil(cur.height / 2)));
        }
        return (cur.width === nw && cur.height === nh) ? cur : scaledCanvas(cur, nw, nh);
    }

    // rgb in [-1, 1], padded to a multiple of 16
    function makeInput(canvas, nw, nh) {
        const px = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, nw, nh).data;
        const W = Math.ceil(nw / 16) * 16, H = Math.ceil(nh / 16) * 16, plane = W * H;
        const data = new Float32Array(3 * plane);
        for (let y = 0; y < H; y++) {
            const sy = Math.min(y, nh - 1);
            for (let x = 0; x < W; x++) {
                const i = (sy * nw + Math.min(x, nw - 1)) * 4;
                const o = y * W + x;
                data[o] = px[i] / 127.5 - 1;
                data[plane + o] = px[i + 1] / 127.5 - 1;
                data[2 * plane + o] = px[i + 2] / 127.5 - 1;
            }
        }
        return { data, W, H };
    }

    async function preload() {
        await Promise.all([loadConfig(), loadSession()]);
    }

    async function detect(canvas, opts = {}) {
        const cfg = await loadConfig();
        const session = await loadSession();
        const w = canvas.width, h = canvas.height;
        const scales = pickScales(w, h, opts.shortSides ? { ...cfg, shortSides: opts.shortSides } : cfg);
        const found = [];

        for (let k = 0; k < scales.length; k++) {
            const s = scales[k];
            if (opts.onProgress) {
                opts.onProgress({ step: 'locate', current: k + 1, total: scales.length });
                await new Promise(r => setTimeout(r, 0));
            }
            const nw = Math.max(16, Math.round(w * s)), nh = Math.max(16, Math.round(h * s));
            const { data, W, H } = makeInput(resizeCanvas(canvas, nw, nh), nw, nh);
            const out = await session.run({ image: new ort.Tensor('float32', data, [1, 3, H, W]) });
            const logits = (out.core_logits || Object.values(out)[0]).data;

            const prob = new Float32Array(nw * nh);
            for (let y = 0; y < nh; y++) {
                for (let x = 0; x < nw; x++) prob[y * nw + x] = 1 / (1 + Math.exp(-logits[y * W + x]));
            }
            for (const [x0, y0, x1, y1, score] of boxesFromMap(prob, nw, nh, cfg)) {
                found.push([x0 / s, y0 / s, x1 / s, y1 / s, score]);
            }
        }

        const boxes = scales.length > 1 ? nms(found, cfg.nmsIou, cfg.nmsContainment) : found;
        return boxes.map(([x0, y0, x1, y1, score]) => ({
            x0: Math.max(0, x0), y0: Math.max(0, y0), x1: Math.min(w, x1), y1: Math.min(h, y1), score
        }));
    }

    window.TextDetector = { detect, preload };
})();
