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
        if (scriptModal?.classList.contains('open')) {
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

async function loadModels() {
    if (models) return models;
    try {
        const loaded = {};
        const manifest = await fetch('assets/models/manifest.json').then(r => r.json());
        await Promise.all(manifest.map(async key => {
            const [session, alphabet] = await Promise.all([
                ort.InferenceSession.create(`assets/models/${key}_crnn.onnx`),
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
    return { gray, w, h };
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

function cropLine(gray, w, h, band) {
    const iw = band.x1 - band.x0 + 1, ih = band.y1 - band.y0 + 1;
    const mx = Math.round(iw * .15), my = Math.round(ih * .15);
    const cx0 = Math.max(0, band.x0 - mx), cy0 = Math.max(0, band.y0 - my);
    const cx1 = Math.min(w - 1, band.x1 + mx), cy1 = Math.min(h - 1, band.y1 + my);
    const cw = cx1 - cx0 + 1, ch = cy1 - cy0 + 1;

    const th = 32, tw = Math.round(cw * 32 / ch);
    if (tw < 1) return null;
    const buf = new Float32Array(th * tw);
    for (let ty = 0; ty < th; ty++) for (let tx = 0; tx < tw; tx++) {
        const sy = ty * ch / th + cy0, sx = tx * cw / tw + cx0;
        const iy = sy | 0, ix = sx | 0;
        const fy = sy - iy, fx = sx - ix;
        const iy1 = Math.min(iy + 1, h - 1), ix1 = Math.min(ix + 1, w - 1);
        buf[ty * tw + tx] = (
            gray[iy * w + ix]  * (1 - fx) * (1 - fy) +
            gray[iy * w + ix1] * fx       * (1 - fy) +
            gray[iy1 * w + ix] * (1 - fx) * fy +
            gray[iy1 * w + ix1] * fx      * fy
        ) / 127.5 - 1;
    }
    return new ort.Tensor('float32', buf, [1, 1, th, tw]);
}

function ctcDecode(logits, alphabet) {
    const [, steps, nc] = logits.dims;
    const d = logits.data;
    let text = '', prev = -1, psum = 0;

    for (let t = 0; t < steps; t++) {
        const base = t * nc;
        let best = -Infinity, bi = 0;
        for (let c = 0; c < nc; c++)
            if (d[base + c] > best) { best = d[base + c]; bi = c; }

        let esum = 0;
        for (let c = 0; c < nc; c++) esum += Math.exp(d[base + c] - best);
        psum += 1 / esum;

        if (bi !== prev && bi !== 0) text += alphabet[bi - 1];
        prev = bi;
    }
    return { text, confidence: psum / steps };
}

async function decodeImage(img) {
    const m = await loadModels();
    if (!m) return null;

    const { gray, w, h } = grayscale(img);
    const bands = segmentLines(gray, w, h);
    if (!bands.length) return null;

    // detect script on densest line
    const pivot = bands.reduce((a, b) => b.ink > a.ink ? b : a);
    const pivotTensor = cropLine(gray, w, h, pivot);
    if (!pivotTensor) return null;

    const detect = [];
    for (const [key, { session, alphabet }] of Object.entries(m)) {
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
    for (const band of bands) {
        const tensor = cropLine(gray, w, h, band);
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
    sourcePane?.classList.add('decoding');

    const thumb = $('decode-thumb');
    const badge = $('decode-script');
    const conf = $('decode-confidence');
    if (thumb) thumb.src = thumbSrc;
    if (badge) badge.textContent = 'Detecting...';
    if (conf) conf.textContent = '';

    const srcTitle = $('source-title');
    const tgtTitle = $('target-title');
    if (srcTitle) srcTitle.textContent = 'Glyph Image';
    if (tgtTitle) tgtTitle.textContent = 'Decoded Text';
    if (textCounter) textCounter.textContent = '';

    if (output) {
        output.textContent = 'Decoding...';
        output.classList.add('placeholder');
        output.style.fontFamily = 'var(--font-ui)';
    }
}

function finishDecode(result) {
    const badge = $('decode-script');
    const conf = $('decode-confidence');

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
    if (badge) badge.textContent = name;
    if (conf) conf.textContent = (result.confidence * 100).toFixed(1) + '%';
    if (output) {
        output.textContent = result.text;
        output.classList.remove('placeholder');
    }
}

function exitDecodeMode() {
    decoding = false;
    sourcePane?.classList.remove('decoding');
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
            finishDecode(await decodeImage(img));
        } catch (err) {
            console.error('Decode error:', err);
            finishDecode(null);
        }
    };
    img.onerror = () => showToast('Could not read image');
    img.src = decodeUrl;
}

// scan btn / file picker
const scanBtn = $('btn-scan');
if (scanBtn) scanBtn.onclick = () => fileInput?.click();
if (fileInput) fileInput.onchange = () => {
    if (fileInput.files?.[0]) handleImageFile(fileInput.files[0]);
    fileInput.value = '';
};

const dismissBtn = $('decode-dismiss');
if (dismissBtn) dismissBtn.onclick = exitDecodeMode;

// drag & drop
if (sourceWrap) {
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
