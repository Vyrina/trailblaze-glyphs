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

const GLYPH_SETS = {
    upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lower: 'abcdefghijklmnopqrstuvwxyz',
    num:   '0123456789'
};

const input = document.getElementById('input-text');
const output = document.getElementById('output-text');
const sizeSlider = document.getElementById('size-slider');
const sizeValue = document.getElementById('size-value');
const scriptModal = document.getElementById('script-modal');
const toastEl = document.getElementById('toast');
const textCounter = document.getElementById('text-counter');
const charmapGrid = document.getElementById('charmap-grid');

function setScript(key) {
    if (!SCRIPTS[key]) return;
    activeScript = key;
    const cfg = SCRIPTS[key];

    document.querySelectorAll('.script-btn, .modal-opt-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.script === key);
    });

    const activeBadge = document.getElementById('active-badge');
    const matrixName = document.getElementById('matrix-script-name');
    if (activeBadge) activeBadge.textContent = cfg.name;
    if (matrixName) matrixName.textContent = cfg.name;

    updateUI(cfg);
    buildCharmap(cfg);
    render();
}

function updateUI(cfg) {
    const dirBadge = document.getElementById('direction-badge');
    const srcTitle = document.getElementById('source-title');
    const targetTitle = document.getElementById('target-title');
    const mobileSrc = document.getElementById('mobile-source-label');
    const mobileTarget = document.getElementById('mobile-target-label');
    const srcChevron = document.getElementById('source-chevron');
    const targetChevron = document.getElementById('target-chevron');
    const srcPill = document.getElementById('mobile-source-pill');
    const targetPill = document.getElementById('mobile-target-pill');

    if (isReverse) {
        if (dirBadge) dirBadge.textContent = `${cfg.name} → Latin`;
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
        if (dirBadge) dirBadge.textContent = `Latin → ${cfg.name}`;
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
        textCounter.textContent = `${text.length} chars · ${words} words`;
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
    const text = input?.value;
    if (!text) return showToast('Nothing to copy');

    const cfg = SCRIPTS[activeScript];
    const scale = 2;
    const fontSize = parseInt(sizeSlider?.value || 18, 10) * scale;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    ctx.font = `${fontSize}px ${cfg.fontFamily}, sans-serif`;
    const textWidth = Math.ceil(ctx.measureText(text).width);
    const pad = 48 * scale;

    canvas.width = textWidth + pad * 2;
    canvas.height = fontSize * 2 + pad * 2;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = `${fontSize}px ${cfg.fontFamily}, sans-serif`;
    ctx.fillStyle = '#1a1a1a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

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

const srcPill = document.getElementById('mobile-source-pill');
const targetPill = document.getElementById('mobile-target-pill');
if (srcPill) srcPill.onclick = () => { if (isReverse) openModal(); };
if (targetPill) targetPill.onclick = () => { if (!isReverse) openModal(); };

const closeBtn = document.getElementById('btn-close-modal');
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
