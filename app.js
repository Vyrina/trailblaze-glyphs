const SCRIPTS = {
    jarilo:    { name: 'Jarilo-VI', fontFamily: "'Jarilo-VI'" },
    xianzhou:  { name: 'Xianzhou',  fontFamily: "'Xianzhou'" },
    penacony:  { name: 'Penacony',  fontFamily: "'Penacony'" },
    amphoreus: { name: 'Amphoreus', fontFamily: "'Amphoreus'" }
};

let activeScript = 'jarilo';
let isReverse = false;
let activeGlyphTab = 'upper';
let toastTimer = null;
let decoding = false;
let decodeUrl = null;
let models = null;

const GLYPH_SETS = {
    upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lower: 'abcdefghijklmnopqrstuvwxyz',
    num:   '0123456789'
};

const $ = (id) => document.getElementById(id);

const input = $('input-text');
const output = $('output-text');
const sizeSlider = $('size-slider');
const sizeValue = $('size-value');
const scriptModal = $('script-modal');
const toastEl = $('toast');
const textCounter = $('text-counter');
const charmapGrid = $('charmap-grid');
const sourcePane = $('source-pane');
const sourceWrap = $('source-wrap');
const fileInput = $('file-input');
const viewer = $('viewer');

function setScript(key) {
    if (!SCRIPTS[key] || decoding) return;
    activeScript = key;
    const cfg = SCRIPTS[key];

    document.querySelectorAll('.script-btn, .modal-opt-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.script === key);
    });

    const activeBadge = $('active-badge');
    const matrixName = $('matrix-script-name');
    if (activeBadge) activeBadge.textContent = cfg.name;
    if (matrixName) matrixName.textContent = cfg.name;

    updateUI(cfg);
    buildCharmap(cfg);
    render();
}

function updateUI(cfg) {
    const dirBadge = $('direction-badge');
    const srcTitle = $('source-title');
    const targetTitle = $('target-title');
    const mobileSrc = $('mobile-source-label');
    const mobileTarget = $('mobile-target-label');
    const srcChevron = $('source-chevron');
    const targetChevron = $('target-chevron');
    const srcPill = $('mobile-source-pill');
    const targetPill = $('mobile-target-pill');

    if (isReverse) {
        if (dirBadge) dirBadge.textContent = `${cfg.name} \u2192 Latin`;
        if (srcTitle) srcTitle.textContent = `Source (${cfg.name})`;
        if (targetTitle) targetTitle.textContent = 'Output (Latin)';
        if (mobileSrc) mobileSrc.textContent = cfg.name;
        if (mobileTarget) mobileTarget.textContent = 'Latin';
        if (srcChevron) srcChevron.style.display = 'block';
        if (targetChevron) targetChevron.style.display = 'none';
        if (srcPill) srcPill.classList.add('select-pill');
        if (targetPill) targetPill.classList.remove('select-pill');
        if (input) input.style.fontFamily = cfg.fontFamily;
        if (output) output.style.fontFamily = 'var(--font-ui)';
    } else {
        if (dirBadge) dirBadge.textContent = `Latin \u2192 ${cfg.name}`;
        if (srcTitle) srcTitle.textContent = 'Source (Latin)';
        if (targetTitle) targetTitle.textContent = `Output (${cfg.name})`;
        if (mobileSrc) mobileSrc.textContent = 'Latin';
        if (mobileTarget) mobileTarget.textContent = cfg.name;
        if (srcChevron) srcChevron.style.display = 'none';
        if (targetChevron) targetChevron.style.display = 'block';
        if (srcPill) srcPill.classList.remove('select-pill');
        if (targetPill) targetPill.classList.add('select-pill');
        if (input) input.style.fontFamily = 'var(--font-ui)';
        if (output) output.style.fontFamily = cfg.fontFamily;
    }

    updateFontSize();
}

function updateFontSize() {
    const size = parseInt(sizeSlider?.value || 18, 10);
    if (sizeValue) sizeValue.textContent = `${size}px`;

    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.size === String(size));
    });

    const px = `${size}px`;
    if (input) input.style.fontSize = px;
    if (output) output.style.fontSize = px;
}

function render() {
    const text = input?.value || '';
    if (textCounter) {
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        textCounter.textContent = `${text.length} chars \u00b7 ${words} words`;
    }

    if (!output) return;
    if (!text) {
        output.textContent = isReverse
            ? 'Type script text to translate back to Latin...'
            : 'Translated glyphs appear here';
        output.classList.add('placeholder');
    } else {
        output.classList.remove('placeholder');
        output.textContent = text;
    }
}

function swap() {
    if (decoding) return;
    isReverse = !isReverse;
    updateUI(SCRIPTS[activeScript]);
    render();
}

function openModal() {
    if (scriptModal) {
        scriptModal.classList.add('open');
        scriptModal.setAttribute('aria-hidden', 'false');
    }
}

function closeModal() {
    if (scriptModal) {
        scriptModal.classList.remove('open');
        scriptModal.setAttribute('aria-hidden', 'true');
    }
}

async function copyPngImage() {
    if (decoding) return;
    const text = input?.value;
    if (!text) return showToast('Nothing to copy');

    const cfg = SCRIPTS[activeScript];
    const scale = 2;
    const fontSize = parseInt(sizeSlider?.value || 18, 10) * scale;
    const leading = Math.round(fontSize * 1.4);
    const pad = 48 * scale;
    const lines = text.split('\n');

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = `${fontSize}px ${cfg.fontFamily}, sans-serif`;

    let maxW = 0;
    for (const ln of lines) {
        const w = ctx.measureText(ln || ' ').width;
        if (w > maxW) maxW = w;
    }

    canvas.width = Math.ceil(maxW) + pad * 2;
    canvas.height = leading * lines.length + pad * 2;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = `${fontSize}px ${cfg.fontFamily}, sans-serif`;
    ctx.fillStyle = '#1a1a1a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], canvas.width / 2, pad + i * leading);
    }

    try {
        canvas.toBlob(async (blob) => {
            if (!blob) return showToast('Export failed');
            try {
                await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob })
                ]);
                showToast('PNG copied to clipboard');
            } catch {
                showToast('Clipboard not supported');
            }
        }, 'image/png');
    } catch {
        showToast('Export failed');
    }
}

function buildCharmap(cfg) {
    if (!charmapGrid) return;
    charmapGrid.innerHTML = '';

    const chars = GLYPH_SETS[activeGlyphTab] || GLYPH_SETS.upper;
    const fragment = document.createDocumentFragment();

    for (const c of chars) {
        const cell = document.createElement('div');
        cell.className = 'matrix-cell';
        cell.title = `Insert '${c}'`;
        cell.innerHTML = `
            <span class="matrix-char" style="font-family: ${cfg.fontFamily}">${c}</span>
            <span class="matrix-sub">${c}</span>
        `;
        cell.onclick = () => {
            if (input) {
                const start = input.selectionStart ?? input.value.length;
                const end = input.selectionEnd ?? input.value.length;
                input.setRangeText(c, start, end, 'end');
                render();
                input.focus();
            }
        };
        fragment.appendChild(cell);
    }
    charmapGrid.appendChild(fragment);
}

document.querySelectorAll('.glyph-tab-btn').forEach(btn => {
    btn.onclick = () => {
        activeGlyphTab = btn.dataset.tab;
        document.querySelectorAll('.glyph-tab-btn').forEach(b => {
            b.classList.toggle('active', b === btn);
        });
        const cfg = SCRIPTS[activeScript];
        if (cfg) buildCharmap(cfg);
    };
});

function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2500);
}

document.querySelectorAll('.script-btn').forEach(btn => {
    btn.onclick = () => setScript(btn.dataset.script);
});

document.querySelectorAll('.modal-opt-btn').forEach(btn => {
    btn.onclick = () => {
        setScript(btn.dataset.script);
        closeModal();
    };
});

const srcPill = $('mobile-source-pill');
const targetPill = $('mobile-target-pill');
if (srcPill) srcPill.onclick = () => { if (isReverse) openModal(); };
if (targetPill) targetPill.onclick = () => { if (!isReverse) openModal(); };

const closeBtn = $('btn-close-modal');
if (closeBtn) closeBtn.onclick = closeModal;

if (scriptModal) {
    scriptModal.onclick = (e) => { if (e.target === scriptModal) closeModal(); };
}

document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.onclick = () => {
        if (btn.dataset.size && sizeSlider) {
            sizeSlider.value = btn.dataset.size;
            updateFontSize();
        }
    };
});

document.querySelectorAll('.sample-btn').forEach(btn => {
    btn.onclick = () => {
        if (input && btn.dataset.quote) {
            input.value = btn.dataset.quote;
            render();
            input.focus();
        }
    };
});

if (input) input.oninput = render;
if (sizeSlider) sizeSlider.oninput = updateFontSize;

document.querySelectorAll('#btn-clear, #btn-clear-mobile').forEach(btn => {
    btn.onclick = () => {
        if (decoding) { exitDecodeMode(); return; }
        if (input) {
            input.value = '';
            render();
            input.focus();
        }
    };
});

document.querySelectorAll('#btn-copy-png, #btn-copy-png-mobile').forEach(btn => {
    btn.onclick = copyPngImage;
});

document.querySelectorAll('#btn-swap, #btn-swap-mobile').forEach(btn => {
    btn.onclick = swap;
});

document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyS') {
        e.preventDefault();
        swap();
    } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyC') {
        e.preventDefault();
        copyPngImage();
    } else if (e.key === 'Escape') {
        if (viewer?.classList.contains('open')) {
            closeViewer();
        } else if (scriptModal?.classList.contains('open')) {
            closeModal();
        } else if (decoding) {
            exitDecodeMode();
        } else if (document.activeElement === input) {
            input.value = '';
            render();
        }
    }
});

if (input) {
    input.value = 'May This Journey Lead Us Starward';
}
if (sizeSlider) {
    sizeSlider.value = '18';
}
setScript('jarilo');


/* ---- glyph decode ---- */

// bump with the models, busts the browser cache
const MODEL_VERSION = '1.7.0';

let modelsLoading = null;

function loadModels() {
    if (models) return Promise.resolve(models);
    if (!modelsLoading) {
        modelsLoading = readModels().finally(() => { modelsLoading = null; });
    }
    return modelsLoading;
}

function preloadModels() {
    loadModels();
    window.TextDetector?.preload().catch(() => {});
}

async function readModels() {
    try {
        const loaded = {};
        const manifest = await fetch('assets/models/manifest.json').then(r => r.json());
        await Promise.all(manifest.map(async key => {
            const [session, alphabet] = await Promise.all([
                ort.InferenceSession.create(`assets/models/${key}_crnn.onnx?v=${MODEL_VERSION}`),
                fetch(`assets/models/${key}_alphabet.json`).then(r => r.json())
            ]);
            loaded[key] = { session, alphabet };
        }));
        models = loaded;
        return models;
    } catch (err) {
        console.error('Model load failed:', err);
        return null;
    }
}

function grayscale(img) {
    const cvs = document.createElement('canvas');
    const ctx = cvs.getContext('2d', { willReadFrequently: true });
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    cvs.width = w; cvs.height = h;
    ctx.drawImage(img, 0, 0);

    const px = ctx.getImageData(0, 0, w, h).data;
    const gray = new Float32Array(w * h);
    for (let i = 0, n = w * h; i < n; i++) {
        const off = i * 4;
        gray[i] = .299 * px[off] + .587 * px[off + 1] + .114 * px[off + 2];
    }
    return { gray, w, h, cvs };
}

function segmentLines(gray, w, h) {
    // per-row ink count
    const inkPerRow = new Uint32Array(h);
    for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++)
            if (gray[y * w + x] < 240) inkPerRow[y]++;

    const bands = [];
    let inText = false, bandStart = 0, gapStart = 0;

    for (let y = 0; y <= h; y++) {
        const hasInk = y < h && inkPerRow[y] > 0;
        if (hasInk && !inText) {
            // small gap, merge with previous band
            if (bands.length > 0 && y - gapStart < 4) {

                bands[bands.length - 1].y1 = y;
            } else {
                bands.push({ y0: y, y1: y, ink: 0 });
            }
            inText = true;
        } else if (!hasInk && inText) {
            gapStart = y;
            inText = false;
        }
        if (hasInk && bands.length > 0) {
            const b = bands[bands.length - 1];
            b.y1 = y;
            b.ink += inkPerRow[y];
        }
    }

    // per-band horizontal ink bbox
    for (const b of bands) {
        let lx = w, rx = 0;
        for (let y = b.y0; y <= b.y1; y++)
            for (let x = 0; x < w; x++)
                if (gray[y * w + x] < 240) {
                    if (x < lx) lx = x;
                    if (x > rx) rx = x;
                }
        b.x0 = lx; b.x1 = rx;
    }
    return bands.filter(b => b.x1 >= b.x0);
}

function normalizeLine(gray, tw, th) {
    const n = gray.length;
    const hist = new Uint32Array(256);
    for (let i = 0; i < n; i++) hist[Math.max(0, Math.min(255, Math.round(gray[i])))]++;
    const pct = (q) => {
        const target = q * (n - 1);
        let acc = 0;
        for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc > target) return v; }
        return 255;
    };
    let lo = pct(.02), hi = pct(.98);
    const range = hi - lo;
    if (range < 24) return gray;

    const frame = [];
    for (let y = 0; y < th; y++)
        for (let x = 0; x < tw; x++)
            if (y < 3 || y >= th - 3 || x < 3 || x >= tw - 3) frame.push(gray[y * tw + x]);
    frame.sort((a, b) => a - b);
    const bg = frame[frame.length >> 1];

    const thr = Math.max(24, .35 * range);
    let bright = 0, dark = 0;
    for (let i = 0; i < n; i++) {
        if (gray[i] > bg + thr) bright++;
        else if (gray[i] < bg - thr) dark++;
    }
    const invert = bright > dark;
    if (invert) { const t = lo; lo = 255 - hi; hi = 255 - t; }
    const stretch = range < 150;

    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) {
        let v = invert ? 255 - gray[i] : gray[i];
        if (stretch) v = Math.max(0, Math.min(1, (v - lo) / (hi - lo))) * 255;
        out[i] = v;
    }
    return out;
}

function cropBox(band, w, h) {
    const ih = band.y1 - band.y0 + 1;
    const pad = Math.round(ih * .15);
    const cx0 = Math.max(0, band.x0 - pad), cy0 = Math.max(0, band.y0 - pad);
    const cx1 = Math.min(w - 1, band.x1 + pad), cy1 = Math.min(h - 1, band.y1 + pad);
    return { cx0, cy0, cw: cx1 - cx0 + 1, ch: cy1 - cy0 + 1 };
}

function cropLine(sourceCvs, w, h, band, normalize = false) {
    const { cx0, cy0, cw, ch } = cropBox(band, w, h);

    const th = 32, tw = Math.round(cw * 32 / ch);
    if (tw < 1) return null;

    const lineCvs = document.createElement('canvas');
    lineCvs.width = tw;
    lineCvs.height = th;
    const ctx = lineCvs.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(sourceCvs, cx0, cy0, cw, ch, 0, 0, tw, th);
    const px = ctx.getImageData(0, 0, tw, th).data;

    let gray = new Float32Array(th * tw);
    for (let i = 0, n = th * tw; i < n; i++) {
        const off = i * 4;
        gray[i] = .299 * px[off] + .587 * px[off + 1] + .114 * px[off + 2];
    }
    if (normalize) gray = normalizeLine(gray, tw, th);

    const buf = new Float32Array(th * tw);
    for (let i = 0, n = th * tw; i < n; i++) buf[i] = gray[i] / 127.5 - 1;
    return new ort.Tensor('float32', buf, [1, 1, th, tw]);
}

// spans = first and last step of every char
function ctcDecode(logits, alphabet) {
    const [, steps, nc] = logits.dims;
    const d = logits.data;
    let text = '', prev = -1, psum = 0, logProb = 0, chars = 0;
    const spans = [];

    for (let t = 0; t < steps; t++) {
        const base = t * nc;
        let best = -Infinity, bi = 0;
        for (let c = 0; c < nc; c++)
            if (d[base + c] > best) { best = d[base + c]; bi = c; }

        let esum = 0;
        for (let c = 0; c < nc; c++) esum += Math.exp(d[base + c] - best);
        psum += 1 / esum;

        if (bi !== prev && bi !== 0) {
            text += alphabet[bi - 1];
            logProb += Math.log(Math.max(1 / esum, 1e-6));
            chars++;
            spans.push([t, t]);
        } else if (bi !== 0) {
            spans[spans.length - 1][1] = t;
        }
        prev = bi;
    }
    return { text, confidence: psum / steps, logProb, chars, spans, steps };
}

/* ---- screenshot decode ---- */

const MIN_LINE_HEIGHT = 11;
const MIN_LINE_CHARS = 2;
const MIN_LINE_CONF = .75;
const PROBE_LINES = 12;
// one detector pass, [512, 768] was twice as slow
const DETECT_SHORT_SIDE = 640;
let lastScan = null;

function flattenToCanvas(img) {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    const cvs = document.createElement('canvas');
    cvs.width = w; cvs.height = h;
    const ctx = cvs.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0);
    return { cvs, w, h };
}

// copy png style: flat light page, dark glyphs
function looksLikePlainText(gray, w, h) {
    const n = w * h;
    const hist = new Uint32Array(256);
    for (let i = 0; i < n; i++) hist[gray[i] | 0]++;
    let mode = 0;
    for (let v = 1; v < 256; v++) if (hist[v] > hist[mode]) mode = v;
    let near = 0;
    for (let v = Math.max(0, mode - 12); v <= Math.min(255, mode + 12); v++) near += hist[v];
    return mode >= 200 && near / n >= .85;
}

function boxToBand(b, w, h) {
    const x0 = Math.max(0, Math.floor(b.x0)), y0 = Math.max(0, Math.floor(b.y0));
    const x1 = Math.min(w - 1, Math.ceil(b.x1) - 1), y1 = Math.min(h - 1, Math.ceil(b.y1) - 1);
    return (x1 >= x0 && y1 >= y0) ? { x0, y0, x1, y1 } : null;
}

function readingOrder(lines) {
    const rows = [];
    for (const ln of lines.slice().sort((a, b) => a.band.y0 - b.band.y0)) {
        const { y0, y1 } = ln.band;
        const row = rows.find(r => Math.min(y1, r.y1) - Math.max(y0, r.y0) >= .5 * Math.min(y1 - y0, r.y1 - r.y0));
        if (row) {
            row.items.push(ln);
            row.y0 = Math.min(row.y0, y0);
            row.y1 = Math.max(row.y1, y1);
        } else {
            rows.push({ y0, y1, items: [ln] });
        }
    }
    rows.sort((a, b) => a.y0 - b.y0);
    return rows.flatMap(r => r.items.sort((a, b) => a.band.x0 - b.band.x0));
}

async function readScan(scan, script, onProgress, allowEmpty = false) {
    const { session, alphabet } = models[script];
    const tooSmall = (ln) => ln.box.y1 - ln.box.y0 < MIN_LINE_HEIGHT;
    for (let i = 0; i < scan.lines.length; i++) {
        const ln = scan.lines[i];
        if (onProgress) {
            onProgress({ step: 'lines', current: i + 1, total: scan.lines.length, script });
            await new Promise(r => setTimeout(r, 0));
        }
        if (tooSmall(ln)) { ln.res = { text: '', confidence: 0, logProb: 0, chars: 0 }; continue; }
        const out = await session.run({ image: ln.tensor });
        ln.res = ctcDecode(Object.values(out)[0], alphabet);
    }
    const readable = (ln) => !tooSmall(ln) && ln.res.text.replace(/[^A-Za-z0-9]/g, '').length >= MIN_LINE_CHARS &&
        Math.exp(ln.res.logProb / Math.max(1, ln.res.chars)) >= MIN_LINE_CONF;
    const kept = readingOrder(scan.lines.filter(readable));
    const skipped = scan.lines.filter(ln => !readable(ln));
    if (!kept.length && !allowEmpty) return null;

    let logProb = 0, chars = 0;
    for (const ln of kept) { logProb += ln.res.logProb; chars += ln.res.chars; }
    scan.picked = script;
    return {
        script,
        text: kept.map(ln => ln.res.text).join('\n'),
        confidence: Math.exp(logProb / Math.max(1, chars)),
        skipped: skipped.length,
        view: { scan, kept, skipped },
        canSwitch: scan.ranking.length > 1
    };
}

async function decodeScreenshot(img, onProgress) {
    if (typeof TextDetector === 'undefined') return null;
    const flat = flattenToCanvas(img);

    let boxes;
    try {
        boxes = await TextDetector.detect(flat.cvs, { onProgress, shortSides: [DETECT_SHORT_SIDE] });
    } catch (err) {
        console.warn('Text detector unavailable, reading the image line by line instead:', err);
        return null;
    }

    const lines = [];
    for (const box of boxes) {
        const band = boxToBand(box, flat.w, flat.h);
        const tensor = band && cropLine(flat.cvs, flat.w, flat.h, band, true);
        if (tensor) lines.push({ box, band, tensor, res: null });
    }
    if (!lines.length) return null;

    // every model reads the biggest lines, best score wins
    const area = (ln) => (ln.box.x1 - ln.box.x0) * (ln.box.y1 - ln.box.y0);
    const bySize = lines.slice().sort((a, b) => area(b) - area(a));
    let probe = bySize.filter(ln => ln.box.y1 - ln.box.y0 >= 12).slice(0, PROBE_LINES);
    if (probe.length < 2) probe = bySize.slice(0, 3);

    const scores = {};
    const entries = Object.entries(models);
    for (let i = 0; i < entries.length; i++) {
        const [key, { session, alphabet }] = entries[i];
        if (onProgress) {
            onProgress({ step: 'detect', current: i + 1, total: entries.length, script: key });
            await new Promise(r => setTimeout(r, 0));
        }
        let logProb = 0, chars = 0;
        for (const ln of probe) {
            const out = await session.run({ image: ln.tensor });
            const res = ctcDecode(Object.values(out)[0], alphabet);
            logProb += res.logProb;
            chars += res.chars;
        }
        scores[key] = chars ? logProb / chars : -Infinity;
    }
    const ranking = Object.keys(scores).sort((a, b) => scores[b] - scores[a]);
    if (!(scores[ranking[0]] > Math.log(.5))) return null;

    const scan = { cvs: flat.cvs, w: flat.w, h: flat.h, lines, ranking, picked: null };
    const result = await readScan(scan, ranking[0], onProgress);
    lastScan = result ? scan : null;
    return result;
}

async function switchScanScript(onProgress) {
    if (!lastScan || lastScan.busy) return null;
    lastScan.busy = true;
    try {
        const order = lastScan.ranking;
        const next = order[(order.indexOf(lastScan.picked) + 1) % order.length];
        return await readScan(lastScan, next, onProgress, true);
    } finally {
        lastScan.busy = false;
    }
}

/* ---- translated image ---- */

const THUMB_SIDE = 1400;

const median = (a) => { a.sort((p, q) => p - q); return a[a.length >> 1]; };

function charExtent(ln, scan) {
    const { text, spans, steps } = ln.res;
    const first = text.search(/\S/), last = text.search(/\S\s*$/);
    const { cx0, cw } = cropBox(ln.band, scan.w, scan.h);
    const stepPx = cw / steps;
    return { x0: cx0 + spans[first][0] * stepPx, x1: cx0 + (spans[last][1] + 1) * stepPx, stepPx };
}

const luma = (c) => {
    const f = (v) => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); };
    return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]);
};
const contrast = (p, q) => {
    const a = luma(p), b = luma(q);
    return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
};

function planLine(px, W, H, ln, ext) {
    const { x0, y0, x1, y1 } = ln.band;
    const bh = y1 - y0 + 1;
    const at = (x, y) => (y * W + x) * 4;

    // bg = median of a ring around the box
    const pad = Math.max(2, Math.round(.12 * bh));
    const ring = [[], [], []];
    for (let y = Math.max(0, y0 - pad); y <= Math.min(H - 1, y1 + pad); y++) {
        for (let x = Math.max(0, x0 - pad); x <= Math.min(W - 1, x1 + pad); x++) {
            if (x >= x0 && x <= x1 && y >= y0 && y <= y1) { x = x1; continue; }
            const i = at(x, y);
            ring[0].push(px[i]); ring[1].push(px[i + 1]); ring[2].push(px[i + 2]);
        }
    }
    const bg = ring[0].length ? ring.map(median) : [255, 255, 255];
    const dist = (i) => Math.max(Math.abs(px[i] - bg[0]), Math.abs(px[i + 1] - bg[1]), Math.abs(px[i + 2] - bg[2]));

    const hist = new Uint32Array(256);
    for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) hist[dist(at(x, y))]++;
    const total = (x1 - x0 + 1) * bh;
    let p95 = 0;
    for (let v = 0, acc = 0; v < 256; v++) { acc += hist[v]; if (acc >= .95 * total) { p95 = v; break; } }
    const thr = Math.max(14, Math.min(60, .35 * p95));

    // ink columns, a bit past the box
    const side = Math.max(6, Math.round(2 * bh));
    const p0 = Math.max(0, x0 - side), p1 = Math.min(W - 1, x1 + side);
    const col = new Uint8Array(p1 - p0 + 1);
    for (let x = p0; x <= p1; x++)
        for (let y = y0; y <= y1; y++)
            if (dist(at(x, y)) > thr) { col[x - p0] = 1; break; }

    // left: cut at an empty column (keeps icons)
    const blank = (x) => x >= p0 && x <= p1 && !col[x - p0];
    const reach = Math.ceil(ext.stepPx) + 1;
    let a = Math.max(x0, Math.floor(ext.x0));
    let cut = -1;
    for (let x = a; x >= a - reach && cut < 0; x--) if (blank(x)) cut = x;
    for (let x = a; x <= a + reach && cut < 0; x++) if (blank(x)) cut = x;
    if (cut >= 0) a = cut;

    // right: the last char comes out short, grow through the ink
    let b = Math.max(a, Math.min(x1, Math.ceil(ext.x1) - 1));
    const limit = Math.min(x1, b + Math.round(.5 * bh) + 2);
    for (let x = b + 1, gap = 0; x <= limit; x++) {
        if (col[x - p0]) { b = x; gap = 0; }
        else if (++gap > 1) break;
    }

    const fringe = Math.max(3, Math.round(.18 * bh)), vm = Math.max(1, Math.round(.06 * bh));
    let ex0 = a, ex1 = b;
    while (ex0 > a - fringe && ex0 > 0 && blank(ex0 - 1)) ex0--;
    while (ex1 < b + fringe && ex1 < W - 1 && blank(ex1 + 1)) ex1++;
    const ey0 = Math.max(0, y0 - vm), ey1 = Math.min(H - 1, y1 + vm);

    const zw = Math.max(6, Math.round(.12 * bh));
    const edge = (dir) => {
        const xs = [];
        for (let i = 0, x = dir < 0 ? ex0 - 1 : ex1 + 1; i < zw; i++, x += dir) {
            if (x < 0 || x >= W || (x >= p0 && x <= p1 && col[x - p0])) break;
            xs.push(x);
        }
        const rows = [];
        for (let y = ey0; y <= ey1; y++) {
            const c = [[], [], []];
            for (const x of xs) { const i = at(x, y); c[0].push(px[i]); c[1].push(px[i + 1]); c[2].push(px[i + 2]); }
            rows.push(xs.length ? c.map(median) : null);
        }
        return rows;
    };
    const left = edge(-1), right = edge(1);

    const fw = ex1 - ex0 + 1, fh = ey1 - ey0 + 1;
    const fill = new ImageData(fw, fh);
    for (let r = 0; r < fh; r++) {
        const l = left[r] || right[r] || bg, q = right[r] || left[r] || bg;
        for (let c = 0; c < fw; c++) {
            const t = (c + .5) / fw, i = (r * fw + c) * 4;
            for (let k = 0; k < 3; k++) fill.data[i + k] = Math.round(l[k] + (q[k] - l[k]) * t);
            fill.data[i + 3] = 255;
        }
    }

    // text colour from the strongest 15% of the ink
    const inkPx = [];
    for (let y = y0; y <= y1; y++)
        for (let x = a; x <= b; x++) {
            const i = at(x, y), d = dist(i);
            if (d > thr) inkPx.push([d, i]);
        }
    inkPx.sort((m, n) => n[0] - m[0]);
    const core = inkPx.slice(0, Math.max(3, Math.round(inkPx.length * .15)));
    const mid = fh >> 1, l = left[mid] || right[mid] || bg, q = right[mid] || left[mid] || bg;
    const back = [0, 1, 2].map(k => (l[k] + q[k]) / 2);
    const to = luma(back) > .18 ? 0 : 255;
    const plain = to ? 245 : 20;
    let ink = core.length >= 3 ? [0, 1, 2].map(k => median(core.map(([, i]) => px[i + k]))) : [plain, plain, plain];
    for (let n = 0; n < 20 && contrast(ink, back) < 4.5; n++) ink = ink.map(v => Math.round(v + (to - v) * .15));

    let gl = 0, gr = 0;
    while (a - 1 - gl >= p0 && !col[a - 1 - gl - p0]) gl++;
    while (b + 1 + gr <= p1 && !col[b + 1 + gr - p0]) gr++;
    const near = .8 * bh;
    const align = gl <= near && gl < gr ? 'left' : gr <= near && gr < gl ? 'right' : 'center';

    return { a, b, bh, cy: (y0 + y1 + 1) / 2, ex0, ey0, fill, ink: `rgb(${ink[0]},${ink[1]},${ink[2]})`, align };
}

function drawText(ctx, p, text, family) {
    let fs = Math.max(7, Math.round(p.bh));
    const width = () => { ctx.font = `600 ${fs}px ${family}`; return ctx.measureText(text).width; };
    const avail = (p.b - p.a + 1) + Math.max(2, .06 * p.bh);
    let tw = width();
    if (tw > avail) {
        fs = Math.max(6, Math.round(.5 * p.bh), Math.floor(fs * avail / tw));
        tw = width();
    }
    const squash = tw > avail ? Math.max(.7, avail / tw) : 1;
    const wd = tw * squash;
    const mid = (p.a + p.b + 1) / 2;
    const x = p.align === 'left' ? p.a : p.align === 'right' ? p.b + 1 - wd : mid - wd / 2;

    ctx.save();
    ctx.fillStyle = p.ink;
    ctx.textBaseline = 'alphabetic';
    ctx.translate(Math.max(0, x), p.cy + .36 * fs);
    ctx.scale(squash, 1);
    ctx.fillText(text, 0, 0);
    ctx.restore();
}

function translateLines(ctx, scan, kept, family) {
    // plan and erase from the original pixels, draw after
    const px = ctx.getImageData(0, 0, scan.w, scan.h).data;
    const todo = [];
    for (const ln of kept) {
        const p = planLine(px, scan.w, scan.h, ln, charExtent(ln, scan));
        ctx.putImageData(p.fill, p.ex0, p.ey0);
        todo.push([p, ln.res.text.trim()]);
    }
    for (const [p, text] of todo) drawText(ctx, p, text, family);
}

function strokeBoxes(ctx, items, color, lw, u) {
    for (const ln of items) {
        const { x0, y0, x1, y1 } = ln.box;
        const args = [x0 - lw / 2, y0 - lw / 2, x1 - x0 + lw, y1 - y0 + lw];
        ctx.lineWidth = lw + 2 * u; ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.strokeRect(...args);
        ctx.lineWidth = lw; ctx.strokeStyle = color; ctx.strokeRect(...args);
    }
}

function renderView(sv) {
    const { scan, kept, skipped, mode, boxes } = sv;
    const c = document.createElement('canvas');
    c.width = scan.w; c.height = scan.h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(scan.cvs, 0, 0);
    if (mode === 'translated') translateLines(ctx, scan, kept, getComputedStyle(document.body).fontFamily);
    if (mode === 'lines' || boxes) {
        const u = Math.max(1, scan.w / THUMB_SIDE);
        const wt = Math.min(scan.w, THUMB_SIDE);
        const lw = (mode === 'lines' ? Math.max(2, Math.round(wt / 450)) : Math.max(1, Math.round(wt / 900))) * u;
        strokeBoxes(ctx, skipped, '#ff9f0a', lw, u);
        strokeBoxes(ctx, kept, '#2fd07a', lw, u);
    }
    return c;
}

function thumbUrl(c) {
    const k = Math.min(1, THUMB_SIDE / c.width);
    if (k === 1) return c.toDataURL('image/jpeg', .92);
    const t = document.createElement('canvas');
    t.width = Math.round(c.width * k);
    t.height = Math.round(c.height * k);
    const ctx = t.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(c, 0, 0, t.width, t.height);
    return t.toDataURL('image/jpeg', .92);
}

async function decodeImage(img, onProgress) {
    if (!models && onProgress) {
        onProgress({ step: 'init', message: 'Loading models...' });
        await new Promise(r => setTimeout(r, 0));
    }
    const m = await loadModels();
    if (!m) return null;

    lastScan = null;
    const { gray, w, h, cvs } = grayscale(img);

    if (!looksLikePlainText(gray, w, h)) {
        const shot = await decodeScreenshot(img, onProgress);
        if (shot) return shot;
    }

    const bands = segmentLines(gray, w, h);
    if (!bands.length) return null;

    // detect script on densest line
    const pivot = bands.reduce((a, b) => b.ink > a.ink ? b : a);
    const pivotTensor = cropLine(cvs, w, h, pivot);
    if (!pivotTensor) return null;

    const detect = [];
    const entries = Object.entries(m);
    const total = entries.length;
    let idx = 0;
    for (const [key, { session, alphabet }] of entries) {
        idx++;
        if (onProgress) {
            onProgress({ step: 'detect', current: idx, total, script: key });
            await new Promise(r => setTimeout(r, 0));
        }
        const out = await session.run({ image: pivotTensor });
        detect.push({ script: key, ...ctcDecode(Object.values(out)[0], alphabet) });
    }
    detect.sort((a, b) => b.confidence - a.confidence);
    if (!detect[0] || detect[0].confidence < .5) return null;

    const picked = detect[0].script;
    const { session, alphabet } = m[picked];

    // decode every line with the chosen script
    const lines = [];
    let confTotal = 0;
    for (let i = 0; i < bands.length; i++) {
        const band = bands[i];
        if (onProgress) {
            onProgress({ step: 'lines', current: i + 1, total: bands.length, script: picked });
            await new Promise(r => setTimeout(r, 0));
        }
        const tensor = cropLine(cvs, w, h, band);
        if (!tensor) { lines.push(''); continue; }
        const out = await session.run({ image: tensor });
        const res = ctcDecode(Object.values(out)[0], alphabet);
        lines.push(res.text);
        confTotal += res.confidence;
    }

    return {
        script: picked,
        text: lines.join('\n'),
        confidence: confTotal / bands.length
    };
}

function enterDecodeMode(thumbSrc) {
    decoding = true;
    resetView();
    sourcePane?.classList.add('decoding');

    const thumb = $('decode-thumb');
    const badge = $('decode-script');
    const conf = $('decode-confidence');
    if (thumb) thumb.src = thumbSrc;
    if (badge) {
        badge.classList.add('loading');
        badge.innerHTML = '<span class="decode-spinner"></span> Detecting...';
    }
    if (conf) conf.textContent = '';

    const srcTitle = $('source-title');
    const tgtTitle = $('target-title');
    if (srcTitle) srcTitle.textContent = 'Glyph Image';
    if (tgtTitle) tgtTitle.textContent = 'Decoded Text';
    if (textCounter) textCounter.textContent = '';

    if (output) {
        output.textContent = 'Analyzing image...';
        output.classList.add('placeholder', 'loading');
        output.style.fontFamily = 'var(--font-ui)';
    }
}

function finishDecode(result) {
    const badge = $('decode-script');
    const conf = $('decode-confidence');
    badge?.classList.remove('loading', 'switchable');
    if (badge) badge.removeAttribute('title');
    output?.classList.remove('loading');

    if (!result) {
        if (badge) badge.textContent = 'Unknown';
        if (conf) conf.textContent = '';
        if (output) {
            output.textContent = "Doesn't look like a supported glyph image";
            output.classList.add('placeholder');
        }
        return;
    }

    const name = SCRIPTS[result.script]?.name || result.script;
    if (badge) {
        badge.textContent = name;
        if (result.canSwitch) {
            badge.classList.add('switchable');
            badge.title = 'Wrong script? Click to try the next one';
        }
    }
    if (conf) {
        const parts = [];
        if (result.text) parts.push((result.confidence * 100).toFixed(1) + '%');
        if (result.skipped) parts.push(`${result.skipped} skipped`);
        conf.textContent = parts.join(' · ');
    }
    if (output) {
        output.textContent = result.text || 'Nothing readable in this script';
        output.classList.toggle('placeholder', !result.text);
    }
    if (result.view) showScanView(result.view);
}

function showDecodeProgress(p) {
    const badge = $('decode-script');
    const conf = $('decode-confidence');
    if (p.step === 'init') {
        if (badge) badge.innerHTML = `<span class="decode-spinner"></span> ${p.message}`;
        if (output) output.textContent = p.message;
    } else if (p.step === 'locate') {
        if (badge) badge.innerHTML = `<span class="decode-spinner"></span> Finding text...`;
        if (conf) conf.textContent = p.total > 1 ? `Scan ${p.current}/${p.total}` : '';
        if (output) output.textContent = 'Finding text in the image...';
    } else if (p.step === 'detect') {
        const name = SCRIPTS[p.script]?.name || p.script;
        if (badge) badge.innerHTML = `<span class="decode-spinner"></span> Detecting (${p.current}/${p.total})...`;
        if (conf) conf.textContent = name;
        if (output) output.textContent = `Testing ${name}... (${p.current}/${p.total})`;
    } else if (p.step === 'lines') {
        const name = SCRIPTS[p.script]?.name || p.script;
        if (badge) badge.innerHTML = `<span class="decode-spinner"></span> Decoding (${name})...`;
        if (conf) conf.textContent = p.total > 1 ? `Line ${p.current}/${p.total}` : 'Reading text...';
        if (output) output.textContent = `Reading lines (${p.current}/${p.total})...`;
    }
}

function exitDecodeMode() {
    decoding = false;
    lastScan = null;
    resetView();
    sourcePane?.classList.remove('decoding');
    const badge = $('decode-script');
    badge?.classList.remove('loading', 'switchable');
    output?.classList.remove('loading');
    const thumb = $('decode-thumb');
    if (thumb) thumb.src = '';
    if (decodeUrl) { URL.revokeObjectURL(decodeUrl); decodeUrl = null; }
    updateUI(SCRIPTS[activeScript]);
    render();
    input?.focus();
}

function handleImageFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    if (decodeUrl) URL.revokeObjectURL(decodeUrl);
    decodeUrl = URL.createObjectURL(file);

    const img = new Image();
    img.onload = async () => {
        enterDecodeMode(decodeUrl);
        try {
            const result = await decodeImage(img, showDecodeProgress);
            finishDecode(result);
        } catch (err) {
            console.error('Decode error:', err);
            finishDecode(null);
        }
    };
    img.onerror = () => showToast('Could not read image');
    img.src = decodeUrl;
}

// script badge: next script
const scriptBadge = $('decode-script');
if (scriptBadge) scriptBadge.onclick = async () => {
    const scan = lastScan;
    if (!scan || scan.busy || !scriptBadge.classList.contains('switchable')) return;
    scriptBadge.classList.remove('switchable');
    scriptBadge.classList.add('loading');
    output?.classList.add('placeholder', 'loading');
    try {
        const result = await switchScanScript(showDecodeProgress);
        // a new image may have come in meanwhile
        if (scan === lastScan) finishDecode(result);
    } catch (err) {
        console.error('Script switch error:', err);
        if (scan === lastScan) finishDecode(null);
    }
};

// scan btn / file picker
const scanBtn = $('btn-scan');
if (scanBtn) scanBtn.onclick = () => {
    preloadModels();
    fileInput?.click();
};
if (fileInput) fileInput.onchange = () => {
    if (fileInput.files?.[0]) handleImageFile(fileInput.files[0]);
    fileInput.value = '';
};

const dismissBtn = $('decode-dismiss');
if (dismissBtn) dismissBtn.onclick = exitDecodeMode;

// screenshot preview
let scanView = null;
let viewerUrl = null;
let viewSeq = 0;
let fontsReady = null;

// canvas text needs the font loaded first
function fontReady() {
    if (!fontsReady) {
        const font = `600 16px ${getComputedStyle(document.body).fontFamily}`;
        fontsReady = Promise.race([
            document.fonts.load(font, 'Aa0').catch(() => {}),
            new Promise(r => setTimeout(r, 1500))
        ]);
    }
    return fontsReady;
}

const toPng = (c) => new Promise(r => c.toBlob(r, 'image/png'));

function resetView() {
    scanView = null;
    viewSeq++;
    closeViewer();
    $('decode-card')?.classList.remove('has-view');
    $('decode-thumb')?.removeAttribute('title');
}

async function showScanView(view) {
    const prev = scanView;
    const sv = scanView = { ...view, mode: prev ? prev.mode : 'translated', boxes: prev ? prev.boxes : true };
    $('decode-card')?.classList.add('has-view');
    $('decode-thumb')?.setAttribute('title', 'Click to enlarge');
    await refreshView(sv);
}

async function refreshView(sv = scanView) {
    if (!sv) return;
    const seq = ++viewSeq;
    await fontReady();
    if (seq !== viewSeq || sv !== scanView) return;
    try {
        const c = renderView(sv);
        const thumb = $('decode-thumb');
        if (thumb) thumb.src = thumbUrl(c);
        document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === sv.mode));
        $('viewer-boxes')?.classList.toggle('active', sv.boxes);
        viewer?.classList.toggle('lines', sv.mode === 'lines');
        if (viewer?.classList.contains('open')) {
            const blob = await toPng(c);
            if (seq !== viewSeq || !viewer.classList.contains('open')) return;
            if (viewerUrl) URL.revokeObjectURL(viewerUrl);
            viewerUrl = URL.createObjectURL(blob);
            $('viewer-img').src = viewerUrl;
        }
    } catch (err) {
        console.error('Preview error:', err);
    }
}

function openViewer() {
    if (!scanView || !viewer) return;
    viewer.classList.remove('zoom');
    viewer.classList.add('open');
    viewer.setAttribute('aria-hidden', 'false');
    $('viewer-img').src = $('decode-thumb').src;
    refreshView();
}

function closeViewer() {
    if (!viewer) return;
    viewer.classList.remove('open', 'zoom');
    viewer.setAttribute('aria-hidden', 'true');
    if (viewerUrl) { URL.revokeObjectURL(viewerUrl); viewerUrl = null; }
    $('viewer-img')?.removeAttribute('src');
}

async function savePng() {
    const sv = scanView;
    if (!sv) return;
    await fontReady();
    const blob = await toPng(renderView(sv));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = sv.mode === 'translated' ? 'glyphs-translated.png' : 'glyphs-lines.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

document.querySelectorAll('[data-view]').forEach(btn => {
    btn.onclick = () => {
        if (!scanView) return;
        scanView.mode = btn.dataset.view;
        refreshView();
    };
});

const boxesBtn = $('viewer-boxes');
if (boxesBtn) boxesBtn.onclick = () => {
    if (!scanView) return;
    scanView.boxes = !scanView.boxes;
    refreshView();
};

document.querySelectorAll('#decode-save, #viewer-save').forEach(btn => btn.onclick = savePng);

const thumbEl = $('decode-thumb');
if (thumbEl) thumbEl.onclick = openViewer;

const viewerClose = $('viewer-close');
if (viewerClose) viewerClose.onclick = closeViewer;

if (viewer) {
    viewer.onclick = (e) => { if (e.target === viewer || e.target.id === 'viewer-body') closeViewer(); };
    $('viewer-img').onclick = () => viewer.classList.toggle('zoom');
}

// drag & drop
if (sourceWrap) {
    sourceWrap.addEventListener('dragenter', (e) => {
        if (e.dataTransfer?.types.includes('Files')) preloadModels();
    });
    sourceWrap.addEventListener('dragover', (e) => {
        e.preventDefault();
        sourceWrap.classList.add('drag-over');
    });
    sourceWrap.addEventListener('dragleave', () => sourceWrap.classList.remove('drag-over'));
    sourceWrap.addEventListener('drop', (e) => {
        e.preventDefault();
        sourceWrap.classList.remove('drag-over');
        const f = e.dataTransfer?.files?.[0];
        if (f) handleImageFile(f);
    });
}

// paste image from clipboard
document.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
        if (item.type.startsWith('image/')) {
            e.preventDefault();
            handleImageFile(item.getAsFile());
            return;
        }
    }
});
