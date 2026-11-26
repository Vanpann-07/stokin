/**
 * StokIn Shared Logic & Flexible LKPD Preset Manager
 * Mengelola penyimpanan data aktif, revisi/preset LKPD fleksibel,
 * import/export CSV & JSON, edit ide individu, dan tema Light/Dark.
 */
(function (window) {
    'use strict';

    const STORAGE_KEY = 'stokin_ide_matriks_data_v1';
    const PRESET_STORAGE_KEY = 'stokin_lkpd_preset_v1';
    const THEME_STORAGE_KEY = 'stokin_theme_preference';

    const INITIAL_LKPD_IDEAS = [
        { id: 'def-1', name: 'Sinkronisasi stok offline dan online', feasibility: 5, impact: 5 },
        { id: 'def-2', name: 'Katalog produk dengan stok real-time', feasibility: 5, impact: 5 },
        { id: 'def-3', name: 'Scan barcode untuk update stok', feasibility: 5, impact: 5 },
        { id: 'def-4', name: 'Dashboard stok, pesanan, dan penjualan', feasibility: 5, impact: 5 },
        { id: 'def-5', name: 'Tampilan aplikasi lebih sederhana', feasibility: 5, impact: 4 },
        { id: 'def-6', name: 'Nota transaksi digital', feasibility: 5, impact: 4 },
        { id: 'def-7', name: 'Rekomendasi produk berdasarkan riwayat pembelian', feasibility: 3, impact: 5 },
        { id: 'def-8', name: 'Pencarian produk berdasarkan kebutuhan pengguna', feasibility: 3, impact: 4 },
        { id: 'def-9', name: 'Sistem membership/loyalty pelanggan', feasibility: 3, impact: 3 },
        { id: 'def-10', name: 'Sistem perbandingan harga & spesifikasi', feasibility: 2, impact: 3 }
    ];

    function clampScore(value, fallback = 3) {
        const n = parseInt(value, 10);
        if (isNaN(n)) return fallback;
        return Math.min(5, Math.max(1, n));
    }

    function evaluateIdea(feasibility, impact) {
        const f = clampScore(feasibility, 3);
        const i = clampScore(impact, 3);
        const totalScore = f + i;

        let quadrant = '';
        let quadrantKey = '';
        let badgeClass = '';
        let color = '';
        let advice = '';

        if (f >= 4 && i >= 4) {
            quadrant = '⭐ PRIORITAS UTAMA';
            quadrantKey = 'Q1';
            badgeClass = 'badge-q1';
            color = '#059669';
            advice = 'Sangat layak dieksekusi langsung untuk MVP utama.';
        } else if (f < 4 && i >= 4) {
            quadrant = '💡 POTENSI TINGGI';
            quadrantKey = 'Q2';
            badgeClass = 'badge-q2';
            color = '#2563eb';
            advice = 'Dampak besar namun butuh riset arsitektur lebih mendalam.';
        } else if (f >= 4 && i < 4) {
            quadrant = '⚠️ PERTIMBANGKAN';
            quadrantKey = 'Q3';
            badgeClass = 'badge-q3';
            color = '#d97706';
            advice = 'Mudah dibuat (quick wins), namun dampak operasional sedang.';
        } else {
            quadrant = '💤 TUNDA';
            quadrantKey = 'Q4';
            badgeClass = 'badge-q4';
            color = '#64748b';
            advice = 'Tunda implementasi hingga siklus rilis berikutnya.';
        }

        return { totalScore, quadrant, quadrantKey, badgeClass, color, advice };
    }

    function createUniqueId(prefix = 'id') {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    }

    function normalizeIdeaItem(item, forceNewId = false, prefix = 'id') {
        const name = String(item && item.name ? item.name : '').trim().slice(0, 120);
        const feasibility = clampScore(item && item.feasibility, 3);
        const impact = clampScore(item && item.impact, 3);
        const ev = evaluateIdea(feasibility, impact);

        return {
            id: (!forceNewId && item && item.id) ? String(item.id) : createUniqueId(prefix),
            name: name,
            feasibility: feasibility,
            impact: impact,
            totalScore: ev.totalScore,
            quadrant: ev.quadrant,
            quadrantKey: ev.quadrantKey
        };
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function getInitialIdeasCopy() {
        return INITIAL_LKPD_IDEAS.map((item, idx) => normalizeIdeaItem({
            id: `lkpd-${idx + 1}`,
            name: item.name,
            feasibility: item.feasibility,
            impact: item.impact
        }, false));
    }

    function loadPreset() {
        try {
            const raw = localStorage.getItem(PRESET_STORAGE_KEY);
            if (raw !== null) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    return parsed
                        .map(item => normalizeIdeaItem(item, false, 'preset'))
                        .filter(item => item.name.length > 0);
                }
            }
        } catch (e) {
            console.warn('Gagal membaca preset LKPD:', e);
        }

        const initial = getInitialIdeasCopy();
        savePreset(initial);
        return initial;
    }

    function savePreset(list) {
        try {
            const clean = (Array.isArray(list) ? list : [])
                .map(item => normalizeIdeaItem(item, false, 'preset'))
                .filter(item => item.name.length > 0);
            localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(clean));
            return clean;
        } catch (e) {
            console.error('Gagal menyimpan preset LKPD:', e);
            return [];
        }
    }

    function loadIdeas() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw !== null) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    // Hormati array kosong [] jika user sebelumnya menghapus seluruh data
                    return parsed
                        .map(item => normalizeIdeaItem(item, false, 'id'))
                        .filter(item => item.name.length > 0);
                }
            }
        } catch (e) {
            console.warn('Gagal memuat ide dari LocalStorage:', e);
        }

        // Kunjungan pertama kali: isi dari preset
        const seeded = loadPreset().map((item, idx) => normalizeIdeaItem({
            ...item,
            id: item.id || `def-${idx + 1}`
        }, false));
        saveIdeas(seeded);
        return seeded;
    }

    function saveIdeas(list) {
        try {
            const clean = (Array.isArray(list) ? list : [])
                .map(item => normalizeIdeaItem(item, false, 'id'))
                .filter(item => item.name.length > 0);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
            return clean;
        } catch (e) {
            console.error('Gagal menyimpan ide ke LocalStorage:', e);
            return [];
        }
    }

    // ==========================================
    // SMART IMPORT PARSER (JSON / CSV / EXCEL / TEXT)
    // ==========================================
    function splitCsvLine(line, delimiter) {
        if (delimiter !== ',') {
            return line.split(delimiter).map(cell => cell.trim().replace(/^"(.*)"$/, '$1').replace(/""/g, '"'));
        }
        const cells = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (ch === ',' && !inQuotes) {
                cells.push(current.trim());
                current = '';
            } else {
                current += ch;
            }
        }
        cells.push(current.trim());
        return cells;
    }

    function isScoreToken(str) {
        return /^[1-5]$/.test(String(str || '').trim());
    }

    function isHeaderRow(cells) {
        const joined = cells.join(' ').toLowerCase();
        return (joined.includes('nama ide') || joined.includes('nama fitur') || joined.includes('ide fitur')) &&
            (joined.includes('feasibility') || joined.includes('impact') || joined.includes('kelayakan') || joined.includes('kuadran'));
    }

    function parseBulkIdeas(rawText) {
        const text = String(rawText || '').replace(/^\uFEFF/, '').trim();
        if (!text) {
            return { items: [], defaultedCount: 0, format: 'empty' };
        }

        // 1. Coba format JSON terlebih dahulu
        if (text.startsWith('[') || text.startsWith('{')) {
            try {
                const parsed = JSON.parse(text);
                const arr = Array.isArray(parsed)
                    ? parsed
                    : (Array.isArray(parsed.ideas) ? parsed.ideas : (Array.isArray(parsed.preset) ? parsed.preset : null));
                if (arr) {
                    const items = arr
                        .map(entry => {
                            if (typeof entry === 'string') {
                                return normalizeIdeaItem({ name: entry, feasibility: 3, impact: 3 }, true, 'preset');
                            }
                            return normalizeIdeaItem({
                                name: entry.name || entry.nama || entry.title || '',
                                feasibility: entry.feasibility ?? entry.feas ?? entry.x ?? 3,
                                impact: entry.impact ?? entry.imp ?? entry.y ?? 3
                            }, true, 'preset');
                        })
                        .filter(item => item.name.length > 0);
                    return { items, defaultedCount: 0, format: 'json' };
                }
            } catch (e) {
                // Lanjut ke parser baris teks/CSV
            }
        }

        // 2. Parser baris CSV, Tab (Excel), Titik Koma, Pipe, atau Teks biasa
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const items = [];
        let defaultedCount = 0;

        lines.forEach((line, lineIdx) => {
            let delimiter = null;
            if (line.includes('\t')) delimiter = '\t';
            else if (line.includes('|')) delimiter = '|';
            else if (line.includes(';')) delimiter = ';';
            else if (line.includes(',')) delimiter = ',';

            if (delimiter) {
                const cols = splitCsvLine(line, delimiter);
                if (lineIdx === 0 && isHeaderRow(cols)) {
                    return;
                }

                // Format export StokIn: No, Nama Ide, Feasibility, Impact, Total Score, Kuadran
                if (cols.length >= 4 && /^\d+$/.test(cols[0]) && isScoreToken(cols[2]) && isScoreToken(cols[3])) {
                    const name = cols[1].trim();
                    if (name) {
                        items.push(normalizeIdeaItem({ name, feasibility: cols[2], impact: cols[3] }, true, 'preset'));
                        return;
                    }
                }

                // Format umum: Nama Ide, Feasibility, Impact (mendukung koma di nama ide bila tidak dikutip)
                if (cols.length >= 3 && isScoreToken(cols[cols.length - 2]) && isScoreToken(cols[cols.length - 1])) {
                    const name = cols.slice(0, cols.length - 2).join(', ').trim();
                    if (name) {
                        items.push(normalizeIdeaItem({
                            name,
                            feasibility: cols[cols.length - 2],
                            impact: cols[cols.length - 1]
                        }, true, 'preset'));
                        return;
                    }
                }

                // Format 5/6 kolom dengan kolom pertama No dan total score di akhir
                if (cols.length >= 5 && isScoreToken(cols[cols.length - 3]) && isScoreToken(cols[cols.length - 2])) {
                    const startIdx = /^\d+$/.test(cols[0]) ? 1 : 0;
                    const name = cols.slice(startIdx, cols.length - 3).join(', ').trim();
                    if (name) {
                        items.push(normalizeIdeaItem({
                            name,
                            feasibility: cols[cols.length - 3],
                            impact: cols[cols.length - 2]
                        }, true, 'preset'));
                        return;
                    }
                }
            }

            // Fallback: 1 baris = 1 nama ide (hapus nomor urut di depan seperti "1. " atau "- ")
            const cleanedName = line.replace(/^(?:\d+[.)]\s+|[-*•]\s+)/, '').trim();
            if (cleanedName) {
                defaultedCount++;
                items.push(normalizeIdeaItem({ name: cleanedName, feasibility: 3, impact: 3 }, true, 'preset'));
            }
        });

        return { items, defaultedCount, format: 'text' };
    }

    function downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    function exportIdeasToCsv(list, filename = 'stokin_daftar_ide_lkpd.csv') {
        let csv = '\uFEFFNo,Nama Ide,Feasibility,Impact,Total Score,Kuadran\n';
        list.forEach((item, idx) => {
            const ev = evaluateIdea(item.feasibility, item.impact);
            const cleanName = `"${String(item.name).replace(/"/g, '""')}"`;
            const cleanQuad = `"${ev.quadrant.replace(/"/g, '""')}"`;
            csv += `${idx + 1},${cleanName},${item.feasibility},${item.impact},${ev.totalScore},${cleanQuad}\n`;
        });
        downloadFile(csv, filename, 'text/csv;charset=utf-8;');
    }

    /**
     * Animate an integer metric element smoothly without negative elapsed frame overshoot.
     */
    function animateValue(element, targetValue) {
        if (!element) return;
        const current = parseInt(element.textContent, 10) || 0;
        if (current === targetValue) return;

        const duration = 400;
        let startTime = null;

        function updateCounter(currentTime) {
            if (startTime === null) startTime = currentTime;
            const elapsed = Math.max(0, currentTime - startTime);
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - (1 - progress) * (1 - progress);
            const val = Math.round(current + (targetValue - current) * ease);
            element.textContent = val;

            if (progress < 1) requestAnimationFrame(updateCounter);
            else element.textContent = targetValue;
        }

        requestAnimationFrame(updateCounter);
    }

    function exportPresetToJson(list, filename = 'stokin_preset_lkpd.json') {
        const payload = {
            app: 'StokIn',
            exportedAt: new Date().toISOString(),
            preset: list.map(item => ({
                name: item.name,
                feasibility: item.feasibility,
                impact: item.impact
            }))
        };
        downloadFile(JSON.stringify(payload, null, 2), filename, 'application/json;charset=utf-8;');
    }

    // ==========================================
    // THEME HELPER
    // ==========================================
    function getSavedTheme() {
        try {
            const saved = localStorage.getItem(THEME_STORAGE_KEY);
            if (saved === 'dark' || saved === 'light') return saved;
        } catch (e) {
            console.warn('Gagal membaca tema:', e);
        }
        return 'light';
    }

    function applyTheme(theme, onThemeChange) {
        const resolved = theme === 'dark' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', resolved);
        try {
            localStorage.setItem(THEME_STORAGE_KEY, resolved);
        } catch (e) {
            console.warn('Gagal menyimpan tema:', e);
        }

        const themeToggleBtn = document.getElementById('themeToggleBtn');
        const themeIcon = document.getElementById('themeIcon');
        const themeLabel = document.getElementById('themeLabel');

        if (resolved === 'dark') {
            if (themeIcon) themeIcon.className = 'bi bi-sun-fill text-warning';
            if (themeLabel) themeLabel.textContent = 'Mode Terang';
            if (themeToggleBtn) themeToggleBtn.setAttribute('title', 'Beralih ke Mode Terang (Light Mode)');
        } else {
            if (themeIcon) themeIcon.className = 'bi bi-moon-stars-fill';
            if (themeLabel) themeLabel.textContent = 'Mode Gelap';
            if (themeToggleBtn) themeToggleBtn.setAttribute('title', 'Beralih ke Mode Gelap (Dark Mode)');
        }

        if (typeof onThemeChange === 'function') {
            onThemeChange(resolved);
        }
    }

    function bindThemeToggle(onThemeChange, notifyFn) {
        const themeToggleBtn = document.getElementById('themeToggleBtn');
        applyTheme(getSavedTheme(), onThemeChange);

        if (themeToggleBtn && !themeToggleBtn.dataset.boundTheme) {
            themeToggleBtn.dataset.boundTheme = '1';
            themeToggleBtn.addEventListener('click', function () {
                const current = document.documentElement.getAttribute('data-theme') || 'light';
                const next = current === 'dark' ? 'light' : 'dark';
                applyTheme(next, onThemeChange);
                if (typeof notifyFn === 'function') {
                    notifyFn(`Mode tampilan diubah ke ${next === 'dark' ? 'Gelap (Dark Mode)' : 'Terang (Light Mode)'}.`, 'bi-palette-fill text-info');
                }
            });
        }
    }

    // ==========================================
    // FLEXIBLE LKPD PRESET & BATCH REVISION MODAL
    // ==========================================
    function ensureLkpdModalMarkup() {
        if (document.getElementById('lkpdModal')) return;

        const wrapper = document.createElement('div');
        wrapper.innerHTML = `
            <div class="modal fade" id="lkpdModal" tabindex="-1" aria-labelledby="lkpdModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg modal-fullscreen-sm-down modal-dialog-centered modal-dialog-scrollable">
                    <div class="modal-content border shadow-elevated" style="border-radius: var(--radius-lg); border-color: var(--stokin-border) !important;">
                        <div class="modal-header" style="border-bottom: 1px solid var(--stokin-border);">
                            <div class="d-flex align-items-center gap-2">
                                <div class="rounded-3 d-flex align-items-center justify-content-center stokin-teal-chip" style="width: 38px; height: 38px;">
                                    <i class="bi bi-journal-check fs-5"></i>
                                </div>
                                <div>
                                    <h5 class="modal-title h6 mb-0 fw-bold" id="lkpdModalLabel" style="color: var(--stokin-text-primary);">
                                        Kelola & Revisi Data Ide LKPD
                                    </h5>
                                    <small class="text-muted" style="font-size: 0.74rem;">
                                        Ubah daftar template ide LKPD langsung di web tanpa mengedit kode sumber
                                    </small>
                                </div>
                            </div>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Tutup"></button>
                        </div>

                        <div class="modal-body p-3 p-md-4">
                            <!-- Sync & Status Summary -->
                            <div class="lkpd-sync-bar d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2 mb-3">
                                <div class="small" style="color: var(--stokin-text-secondary);">
                                    <i class="bi bi-database-check me-1" style="color: var(--stokin-teal-600);"></i>
                                    <span id="lkpdSummaryText">Memuat daftar preset...</span>
                                </div>
                                <div class="d-flex align-items-center gap-2 flex-wrap">
                                    <button type="button" id="lkpdCopyFromActiveBtn" class="btn btn-sm btn-outline-secondary" style="border-radius: 8px; color: var(--stokin-text-secondary); border-color: var(--stokin-border);">
                                        <i class="bi bi-copy me-1"></i>Salin dari Matriks Aktif
                                    </button>
                                    <button type="button" id="lkpdResetSampleBtn" class="btn btn-sm btn-outline-secondary" style="border-radius: 8px; color: var(--stokin-text-secondary); border-color: var(--stokin-border);">
                                        <i class="bi bi-arrow-counterclockwise me-1"></i>Contoh Awal (10 Ide)
                                    </button>
                                </div>
                            </div>

                            <!-- Tabs -->
                            <div class="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-2 mb-3">
                                <div class="lkpd-tab-nav" role="tablist" aria-label="Mode Pengelolaan LKPD">
                                    <button type="button" class="lkpd-tab-btn active" id="lkpdTabBtnEditor" role="tab" aria-selected="true" aria-controls="lkpdTabEditor">
                                        <i class="bi bi-pencil-square"></i>
                                        <span>Editor Daftar Ide</span>
                                        <span id="lkpdDraftBadge" class="badge rounded-pill stokin-teal-chip" style="font-size: 0.7rem;">0</span>
                                    </button>
                                    <button type="button" class="lkpd-tab-btn" id="lkpdTabBtnImport" role="tab" aria-selected="false" aria-controls="lkpdTabImport">
                                        <i class="bi bi-file-earmark-arrow-up"></i>
                                        <span>Import Teks / File & Backup</span>
                                    </button>
                                </div>
                            </div>

                            <!-- TAB 1: BATCH EDITOR -->
                            <div id="lkpdTabEditor" role="tabpanel" aria-labelledby="lkpdTabBtnEditor">
                                <div class="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-3">
                                    <button type="button" id="lkpdAddRowBtn" class="btn-modern-outline btn-sm">
                                        <i class="bi bi-plus-circle-fill" style="color: var(--stokin-teal-600);"></i>
                                        <span>Tambah Baris Ide</span>
                                    </button>
                                    <button type="button" id="lkpdClearDraftBtn" class="btn-modern-danger-outline btn-sm">
                                        <i class="bi bi-trash3"></i>
                                        <span>Hapus Semua Baris</span>
                                    </button>
                                </div>

                                <div id="lkpdEditorError" class="alert alert-danger py-2 px-3 small d-none mb-3" role="alert"></div>

                                <div id="lkpdEditorRows" class="d-flex flex-column gap-2"></div>

                                <div id="lkpdEditorEmpty" class="text-center py-4 px-3 rounded-3 border d-none" style="background: var(--stokin-card-subtle); border-color: var(--stokin-border) !important;">
                                    <i class="bi bi-inbox fs-2 text-muted d-block mb-2"></i>
                                    <h6 class="fw-bold mb-1" style="color: var(--stokin-text-primary);">Daftar Preset LKPD Kosong</h6>
                                    <p class="small text-muted mb-3">
                                        Semua data sebelumnya telah dihapus. Tambahkan ide baru atau impor daftar revisi dari tab Import.
                                    </p>
                                    <div class="d-flex justify-content-center gap-2 flex-wrap">
                                        <button type="button" id="lkpdEmptyAddBtn" class="btn-modern-primary btn-sm">
                                            <i class="bi bi-plus-circle-fill"></i>
                                            <span>Tambah Baris Baru</span>
                                        </button>
                                        <button type="button" id="lkpdEmptyGoImportBtn" class="btn-modern-outline btn-sm">
                                            <i class="bi bi-file-earmark-arrow-up"></i>
                                            <span>Import dari Teks / CSV</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- TAB 2: IMPORT / BACKUP -->
                            <div id="lkpdTabImport" class="d-none" role="tabpanel" aria-labelledby="lkpdTabBtnImport">
                                <div class="lkpd-import-box mb-3">
                                    <label for="lkpdBulkTextarea" class="form-label fw-bold small mb-1" style="color: var(--stokin-text-primary);">
                                        Paste Daftar Revisi LKPD (dari Excel, Word, atau Catatan)
                                    </label>
                                    <p class="small text-muted mb-2">
                                        Masukkan 1 ide per baris dengan format <code>Nama Ide, Feasibility (1-5), Impact (1-5)</code>. Bisa juga menempel langsung 3 kolom dari Excel atau hasil Export CSV StokIn.
                                    </p>
                                    <div class="lkpd-code-sample mb-2">Sinkronisasi stok real-time, 5, 5
Notifikasi stok menipis via WhatsApp, 4, 5
Scan barcode kamera HP, 5, 4</div>
                                    <textarea id="lkpdBulkTextarea" class="form-control form-control-modern mb-2" rows="6"
                                        placeholder="Tempel daftar ide revisi LKPD di sini..."></textarea>

                                    <div class="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-2 pt-1">
                                        <div class="d-flex align-items-center gap-2 flex-wrap">
                                            <label for="lkpdFileInput" class="btn btn-sm btn-outline-secondary mb-0" style="border-radius: 8px; cursor: pointer; color: var(--stokin-text-secondary); border-color: var(--stokin-border);">
                                                <i class="bi bi-upload me-1"></i>Pilih File (.csv / .json / .txt)
                                            </label>
                                            <input type="file" id="lkpdFileInput" accept=".csv,.json,.txt" class="d-none">
                                            <span id="lkpdSelectedFileName" class="small text-muted">Belum ada file dipilih</span>
                                        </div>

                                        <div class="d-flex align-items-center gap-2 flex-wrap">
                                            <button type="button" id="lkpdImportAppendBtn" class="btn-modern-outline btn-sm">
                                                <i class="bi bi-plus-lg"></i>
                                                <span>Tambah ke Editor</span>
                                            </button>
                                            <button type="button" id="lkpdImportReplaceBtn" class="btn-modern-primary btn-sm">
                                                <i class="bi bi-arrow-repeat"></i>
                                                <span>Ganti Isi Editor</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div id="lkpdImportStatus" class="alert py-2 px-3 small d-none mb-3" role="alert"></div>

                                <div class="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-2 p-3 rounded-3 border" style="background: var(--stokin-card-subtle); border-color: var(--stokin-border) !important;">
                                    <div>
                                        <div class="fw-bold small" style="color: var(--stokin-text-primary);">Backup & Bagikan Preset LKPD</div>
                                        <small class="text-muted">Simpan hasil revisi ke komputer agar mudah dipakai ulang di perangkat lain.</small>
                                    </div>
                                    <div class="d-flex align-items-center gap-2 flex-wrap">
                                        <button type="button" id="lkpdExportJsonBtn" class="btn btn-sm btn-outline-secondary" style="border-radius: 8px; color: var(--stokin-text-secondary); border-color: var(--stokin-border);">
                                            <i class="bi bi-filetype-json me-1"></i>Download Preset (.json)
                                        </button>
                                        <button type="button" id="lkpdExportCsvBtn" class="btn btn-sm btn-outline-secondary" style="border-radius: 8px; color: var(--stokin-text-secondary); border-color: var(--stokin-border);">
                                            <i class="bi bi-filetype-csv me-1"></i>Download CSV
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="modal-footer d-flex flex-column-reverse flex-md-row align-items-stretch align-items-md-center justify-content-between gap-2" style="border-top: 1px solid var(--stokin-border);">
                            <button type="button" class="btn btn-outline-secondary btn-sm px-3" data-bs-dismiss="modal" style="border-radius: 9px; min-height: 40px; color: var(--stokin-text-secondary); border-color: var(--stokin-border);">
                                Tutup
                            </button>
                            <div class="d-flex flex-wrap align-items-center justify-content-end gap-2">
                                <button type="button" id="lkpdSavePresetOnlyBtn" class="btn-modern-outline btn-sm flex-grow-1 flex-md-grow-0">
                                    <i class="bi bi-bookmark-check"></i>
                                    <span>Simpan Preset Saja</span>
                                </button>
                                <button type="button" id="lkpdAppendActiveBtn" class="btn-modern-outline btn-sm flex-grow-1 flex-md-grow-0">
                                    <i class="bi bi-plus-circle"></i>
                                    <span>Tambahkan ke Matriks</span>
                                </button>
                                <button type="button" id="lkpdReplaceActiveBtn" class="btn-modern-primary btn-sm flex-grow-1 flex-md-grow-0">
                                    <i class="bi bi-check2-all"></i>
                                    <span>Hapus Data Lama & Terapkan</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(wrapper.firstElementChild);
    }

    function initAppControllers(config) {
        const {
            getIdeas,
            setIdeas,
            onDataChanged,
            onThemeChange,
            notify,
            selectFeasScore,
            selectImpactScore,
            updateLivePreview
        } = config;

        bindThemeToggle(onThemeChange, notify);
        ensureLkpdModalMarkup();

        // -------------------------------
        // A. Single Add / Edit Modal (#ideaModal)
        // -------------------------------
        const ideaModalEl = document.getElementById('ideaModal');
        const ideaModalLabel = document.getElementById('ideaModalLabel');
        const ideaForm = document.getElementById('ideaForm');
        const ideaNameInput = document.getElementById('ideaName');
        const feasibilitySelect = document.getElementById('feasibilitySelect');
        const impactSelect = document.getElementById('impactSelect');
        const btnSubmitIdea = document.getElementById('btnSubmitIdea');
        const btnDeleteFromModal = document.getElementById('btnDeleteFromModal');

        // Pastikan input tersembunyi untuk edit ID & box error inline tersedia di #ideaModal
        let ideaEditIdInput = document.getElementById('ideaEditId');
        if (ideaForm && !ideaEditIdInput) {
            ideaEditIdInput = document.createElement('input');
            ideaEditIdInput.type = 'hidden';
            ideaEditIdInput.id = 'ideaEditId';
            ideaEditIdInput.value = '';
            ideaForm.prepend(ideaEditIdInput);
        }

        let ideaFormErrorEl = document.getElementById('ideaFormError');
        if (ideaForm && !ideaFormErrorEl) {
            ideaFormErrorEl = document.createElement('div');
            ideaFormErrorEl.id = 'ideaFormError';
            ideaFormErrorEl.className = 'alert alert-danger py-2 px-3 small d-none mb-3';
            ideaFormErrorEl.setAttribute('role', 'alert');
            ideaForm.prepend(ideaFormErrorEl);
        }

        function setIdeaFormError(msg) {
            if (!ideaFormErrorEl) return;
            if (!msg) {
                ideaFormErrorEl.textContent = '';
                ideaFormErrorEl.classList.add('d-none');
            } else {
                ideaFormErrorEl.textContent = msg;
                ideaFormErrorEl.classList.remove('d-none');
            }
        }

        function resetIdeaModalToCreate() {
            if (ideaEditIdInput) ideaEditIdInput.value = '';
            if (ideaForm) ideaForm.reset();
            if (feasibilitySelect) feasibilitySelect.value = '';
            if (impactSelect) impactSelect.value = '';
            document.querySelectorAll('#ideaModal .score-btn').forEach(b => b.classList.remove('active'));

            const feasDesc = document.getElementById('feasibilityDescText');
            if (feasDesc) feasDesc.textContent = 'Pilih skala 1 (sangat butuh riset berat/biaya) hingga 5 (cepat dibuat, API siap).';
            const impDesc = document.getElementById('impactDescText');
            if (impDesc) impDesc.textContent = 'Pilih skala 1 (dampak kecil) hingga 5 (krusial mencegah overselling/rugi).';

            if (ideaModalLabel) ideaModalLabel.textContent = 'Tambah Ide Fitur Baru';
            if (btnSubmitIdea) {
                btnSubmitIdea.innerHTML = '<i class="bi bi-plus-circle-fill"></i><span>Simpan Ide ke Matriks</span>';
            }
            if (btnDeleteFromModal) btnDeleteFromModal.classList.add('d-none');
            setIdeaFormError('');
            if (typeof updateLivePreview === 'function') updateLivePreview();
        }

        function openEditModal(ideaId) {
            const list = getIdeas();
            const target = list.find(i => i.id === ideaId);
            if (!target || !ideaModalEl) return;

            setIdeaFormError('');
            if (ideaEditIdInput) ideaEditIdInput.value = target.id;
            if (ideaNameInput) ideaNameInput.value = target.name;
            if (typeof selectFeasScore === 'function') selectFeasScore(Number(target.feasibility));
            if (typeof selectImpactScore === 'function') selectImpactScore(Number(target.impact));

            if (ideaModalLabel) ideaModalLabel.textContent = 'Edit Ide Fitur';
            if (btnSubmitIdea) {
                btnSubmitIdea.innerHTML = '<i class="bi bi-check-circle-fill"></i><span>Simpan Perubahan</span>';
            }
            if (btnDeleteFromModal) {
                btnDeleteFromModal.classList.remove('d-none');
            }

            const modalInstance = bootstrap.Modal.getOrCreateInstance(ideaModalEl);
            modalInstance.show();
        }

        if (ideaModalEl) {
            ideaModalEl.addEventListener('shown.bs.modal', function () {
                if (ideaNameInput) ideaNameInput.focus();
            });
            ideaModalEl.addEventListener('hidden.bs.modal', function () {
                resetIdeaModalToCreate();
            });
        }

        if (btnDeleteFromModal) {
            btnDeleteFromModal.addEventListener('click', function () {
                const editId = ideaEditIdInput ? ideaEditIdInput.value : '';
                if (!editId) return;
                const current = getIdeas();
                const target = current.find(i => i.id === editId);
                const name = target ? target.name : 'ini';
                if (!confirm(`Hapus ide "${name}" dari matriks?`)) return;

                const next = current.filter(i => i.id !== editId);
                saveIdeas(next);
                setIdeas(next);
                onDataChanged();

                const modalInstance = bootstrap.Modal.getInstance(ideaModalEl);
                if (modalInstance) modalInstance.hide();
                if (typeof notify === 'function') {
                    notify(`Ide "${name}" telah dihapus.`, 'bi-trash3-fill text-danger');
                }
            });
        }

        if (ideaForm) {
            ideaForm.addEventListener('submit', function (e) {
                e.preventDefault();
                setIdeaFormError('');

                const editId = ideaEditIdInput ? ideaEditIdInput.value.trim() : '';
                const name = ideaNameInput ? ideaNameInput.value.trim() : '';
                const feasibility = parseInt(feasibilitySelect ? feasibilitySelect.value : '', 10);
                const impact = parseInt(impactSelect ? impactSelect.value : '', 10);

                if (!name) {
                    setIdeaFormError('Mohon masukkan nama ide fitur terlebih dahulu.');
                    if (ideaNameInput) ideaNameInput.focus();
                    return;
                }

                if (isNaN(feasibility) || isNaN(impact)) {
                    setIdeaFormError('Mohon pilih nilai skala Feasibility (X) dan Impact (Y) dari 1 hingga 5.');
                    return;
                }

                const ev = evaluateIdea(feasibility, impact);
                const current = [...getIdeas()];

                if (editId) {
                    const idx = current.findIndex(i => i.id === editId);
                    if (idx !== -1) {
                        current[idx] = {
                            ...current[idx],
                            name: name,
                            feasibility: feasibility,
                            impact: impact,
                            totalScore: ev.totalScore,
                            quadrant: ev.quadrant,
                            quadrantKey: ev.quadrantKey
                        };
                    }
                    saveIdeas(current);
                    setIdeas(current);
                    onDataChanged();

                    const modalInstance = bootstrap.Modal.getInstance(ideaModalEl);
                    if (modalInstance) modalInstance.hide();
                    if (typeof notify === 'function') {
                        notify(`Perubahan ide "${name}" (${ev.quadrant}) disimpan.`);
                    }
                } else {
                    const newIdea = {
                        id: createUniqueId('id'),
                        name: name,
                        feasibility: feasibility,
                        impact: impact,
                        totalScore: ev.totalScore,
                        quadrant: ev.quadrant,
                        quadrantKey: ev.quadrantKey
                    };
                    current.unshift(newIdea);
                    saveIdeas(current);
                    setIdeas(current);
                    onDataChanged();

                    const modalInstance = bootstrap.Modal.getInstance(ideaModalEl);
                    if (modalInstance) modalInstance.hide();
                    if (typeof notify === 'function') {
                        notify(`Ide "${name}" berhasil ditambahkan ke ${ev.quadrant}.`);
                    }
                }
            });
        }

        // -------------------------------
        // B. Flexible LKPD Modal (#lkpdModal)
        // -------------------------------
        const lkpdModalEl = document.getElementById('lkpdModal');
        const lkpdSummaryText = document.getElementById('lkpdSummaryText');
        const lkpdDraftBadge = document.getElementById('lkpdDraftBadge');
        const lkpdTabBtnEditor = document.getElementById('lkpdTabBtnEditor');
        const lkpdTabBtnImport = document.getElementById('lkpdTabBtnImport');
        const lkpdTabEditor = document.getElementById('lkpdTabEditor');
        const lkpdTabImport = document.getElementById('lkpdTabImport');
        const lkpdEditorRows = document.getElementById('lkpdEditorRows');
        const lkpdEditorEmpty = document.getElementById('lkpdEditorEmpty');
        const lkpdEditorError = document.getElementById('lkpdEditorError');
        const lkpdBulkTextarea = document.getElementById('lkpdBulkTextarea');
        const lkpdFileInput = document.getElementById('lkpdFileInput');
        const lkpdSelectedFileName = document.getElementById('lkpdSelectedFileName');
        const lkpdImportStatus = document.getElementById('lkpdImportStatus');

        let draftPreset = [];

        function switchLkpdTab(tabName) {
            const isEditor = tabName === 'editor';
            lkpdTabBtnEditor.classList.toggle('active', isEditor);
            lkpdTabBtnImport.classList.toggle('active', !isEditor);
            lkpdTabBtnEditor.setAttribute('aria-selected', String(isEditor));
            lkpdTabBtnImport.setAttribute('aria-selected', String(!isEditor));
            lkpdTabEditor.classList.toggle('d-none', !isEditor);
            lkpdTabImport.classList.toggle('d-none', isEditor);
        }

        function setLkpdEditorError(msg) {
            if (!lkpdEditorError) return;
            if (!msg) {
                lkpdEditorError.textContent = '';
                lkpdEditorError.classList.add('d-none');
            } else {
                lkpdEditorError.textContent = msg;
                lkpdEditorError.classList.remove('d-none');
            }
        }

        function setImportStatus(msg, type = 'success') {
            if (!lkpdImportStatus) return;
            if (!msg) {
                lkpdImportStatus.textContent = '';
                lkpdImportStatus.className = 'alert py-2 px-3 small d-none mb-3';
                return;
            }
            const alertClass = type === 'error'
                ? 'alert-danger'
                : (type === 'warning' ? 'alert-warning' : 'alert-success');
            lkpdImportStatus.className = `alert ${alertClass} py-2 px-3 small mb-3`;
            lkpdImportStatus.textContent = msg;
        }

        function updateLkpdSummary() {
            const activeCount = getIdeas().length;
            if (lkpdDraftBadge) lkpdDraftBadge.textContent = draftPreset.length;
            if (lkpdSummaryText) {
                lkpdSummaryText.innerHTML = `Editor Preset LKPD: <strong>${draftPreset.length}</strong> ide &bull; Matriks Aktif: <strong>${activeCount}</strong> ide`;
            }
        }

        function renderScoreOptions(selectedVal) {
            const labels = {
                1: '1 - Sangat Rendah/Sulit',
                2: '2 - Rendah/Sulit',
                3: '3 - Sedang',
                4: '4 - Tinggi/Mudah',
                5: '5 - Sangat Tinggi/Mudah'
            };
            let html = '';
            for (let s = 1; s <= 5; s++) {
                html += `<option value="${s}" ${Number(selectedVal) === s ? 'selected' : ''}>${labels[s]}</option>`;
            }
            return html;
        }

        function renderLkpdEditorRows() {
            if (!lkpdEditorRows) return;
            lkpdEditorRows.innerHTML = '';
            setLkpdEditorError('');
            updateLkpdSummary();

            if (draftPreset.length === 0) {
                if (lkpdEditorEmpty) lkpdEditorEmpty.classList.remove('d-none');
                return;
            }
            if (lkpdEditorEmpty) lkpdEditorEmpty.classList.add('d-none');

            draftPreset.forEach((item, idx) => {
                const ev = evaluateIdea(item.feasibility, item.impact);
                const rowEl = document.createElement('div');
                rowEl.className = 'lkpd-editor-row';
                rowEl.dataset.rowIndex = String(idx);
                rowEl.innerHTML = `
                    <div class="row g-2 align-items-center">
                        <div class="col-12 col-md-5 d-flex align-items-center gap-2">
                            <span class="lkpd-row-index">${idx + 1}</span>
                            <input type="text"
                                class="form-control form-control-sm lkpd-name-input"
                                data-field="name"
                                value="${escapeHtml(item.name)}"
                                placeholder="Tuliskan nama ide fitur LKPD..."
                                aria-label="Nama ide baris ke-${idx + 1}"
                                maxlength="120">
                        </div>
                        <div class="col-6 col-md-2">
                            <label class="d-block d-md-none text-muted mb-1" style="font-size: 0.7rem;">Feasibility (X)</label>
                            <select class="form-select form-select-sm lkpd-select-score" data-field="feasibility" aria-label="Feasibility baris ke-${idx + 1}">
                                ${renderScoreOptions(item.feasibility)}
                            </select>
                        </div>
                        <div class="col-6 col-md-2">
                            <label class="d-block d-md-none text-muted mb-1" style="font-size: 0.7rem;">Impact (Y)</label>
                            <select class="form-select form-select-sm lkpd-select-score" data-field="impact" aria-label="Impact baris ke-${idx + 1}">
                                ${renderScoreOptions(item.impact)}
                            </select>
                        </div>
                        <div class="col-9 col-md-2 text-md-center">
                            <span class="${ev.badgeClass} lkpd-row-badge d-inline-block text-truncate" style="max-width: 100%; font-size: 0.7rem;">
                                ${ev.quadrantKey}: ${ev.totalScore} pts
                            </span>
                        </div>
                        <div class="col-3 col-md-1 text-end">
                            <button type="button" class="btn btn-sm btn-outline-danger btn-row-action lkpd-row-delete" title="Hapus baris ini" aria-label="Hapus baris ke-${idx + 1}">
                                <i class="bi bi-trash3-fill"></i>
                            </button>
                        </div>
                    </div>
                `;
                lkpdEditorRows.appendChild(rowEl);
            });
        }

        function validateDraftRows() {
            setLkpdEditorError('');
            document.querySelectorAll('.lkpd-editor-row').forEach(r => r.classList.remove('lkpd-row-invalid'));

            for (let i = 0; i < draftPreset.length; i++) {
                if (!String(draftPreset[i].name || '').trim()) {
                    const badRow = lkpdEditorRows.querySelector(`[data-row-index="${i}"]`);
                    if (badRow) {
                        badRow.classList.add('lkpd-row-invalid');
                        const input = badRow.querySelector('.lkpd-name-input');
                        if (input) {
                            input.focus();
                            input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    }
                    setLkpdEditorError(`Baris ke-${i + 1} belum memiliki Nama Ide Fitur. Isi nama ide atau hapus baris kosong.`);
                    return false;
                }
            }
            return true;
        }

        function addBlankDraftRow() {
            setLkpdEditorError('');
            draftPreset.push({
                id: createUniqueId('preset'),
                name: '',
                feasibility: 4,
                impact: 4
            });
            renderLkpdEditorRows();
            const lastInput = lkpdEditorRows.querySelector(`[data-row-index="${draftPreset.length - 1}"] .lkpd-name-input`);
            if (lastInput) {
                lastInput.focus();
                lastInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }

        if (lkpdEditorRows) {
            lkpdEditorRows.addEventListener('input', function (e) {
                const rowEl = e.target.closest('.lkpd-editor-row');
                if (!rowEl) return;
                const idx = parseInt(rowEl.dataset.rowIndex, 10);
                if (e.target.dataset.field === 'name' && draftPreset[idx]) {
                    draftPreset[idx].name = e.target.value;
                    if (e.target.value.trim()) rowEl.classList.remove('lkpd-row-invalid');
                }
            });

            lkpdEditorRows.addEventListener('change', function (e) {
                const rowEl = e.target.closest('.lkpd-editor-row');
                if (!rowEl) return;
                const idx = parseInt(rowEl.dataset.rowIndex, 10);
                const field = e.target.dataset.field;
                if ((field === 'feasibility' || field === 'impact') && draftPreset[idx]) {
                    draftPreset[idx][field] = clampScore(e.target.value, 3);
                    const ev = evaluateIdea(draftPreset[idx].feasibility, draftPreset[idx].impact);
                    const badgeEl = rowEl.querySelector('.lkpd-row-badge');
                    if (badgeEl) {
                        badgeEl.className = `${ev.badgeClass} lkpd-row-badge d-inline-block text-truncate`;
                        badgeEl.textContent = `${ev.quadrantKey}: ${ev.totalScore} pts`;
                    }
                }
            });

            lkpdEditorRows.addEventListener('click', function (e) {
                const delBtn = e.target.closest('.lkpd-row-delete');
                if (!delBtn) return;
                const rowEl = delBtn.closest('.lkpd-editor-row');
                const idx = parseInt(rowEl.dataset.rowIndex, 10);
                if (!isNaN(idx)) {
                    draftPreset.splice(idx, 1);
                    renderLkpdEditorRows();
                }
            });
        }

        if (lkpdTabBtnEditor) lkpdTabBtnEditor.addEventListener('click', () => switchLkpdTab('editor'));
        if (lkpdTabBtnImport) lkpdTabBtnImport.addEventListener('click', () => switchLkpdTab('import'));

        const lkpdAddRowBtn = document.getElementById('lkpdAddRowBtn');
        const lkpdEmptyAddBtn = document.getElementById('lkpdEmptyAddBtn');
        const lkpdEmptyGoImportBtn = document.getElementById('lkpdEmptyGoImportBtn');
        const lkpdClearDraftBtn = document.getElementById('lkpdClearDraftBtn');
        const lkpdCopyFromActiveBtn = document.getElementById('lkpdCopyFromActiveBtn');
        const lkpdResetSampleBtn = document.getElementById('lkpdResetSampleBtn');
        const lkpdImportReplaceBtn = document.getElementById('lkpdImportReplaceBtn');
        const lkpdImportAppendBtn = document.getElementById('lkpdImportAppendBtn');
        const lkpdExportJsonBtn = document.getElementById('lkpdExportJsonBtn');
        const lkpdExportCsvBtn = document.getElementById('lkpdExportCsvBtn');
        const lkpdSavePresetOnlyBtn = document.getElementById('lkpdSavePresetOnlyBtn');
        const lkpdAppendActiveBtn = document.getElementById('lkpdAppendActiveBtn');
        const lkpdReplaceActiveBtn = document.getElementById('lkpdReplaceActiveBtn');

        if (lkpdAddRowBtn) lkpdAddRowBtn.addEventListener('click', addBlankDraftRow);
        if (lkpdEmptyAddBtn) lkpdEmptyAddBtn.addEventListener('click', addBlankDraftRow);
        if (lkpdEmptyGoImportBtn) lkpdEmptyGoImportBtn.addEventListener('click', () => switchLkpdTab('import'));

        if (lkpdClearDraftBtn) {
            lkpdClearDraftBtn.addEventListener('click', function () {
                if (draftPreset.length === 0) return;
                draftPreset = [];
                renderLkpdEditorRows();
                if (typeof notify === 'function') {
                    notify('Semua baris di editor dihapus. Klik Simpan atau Terapkan untuk memperbarui.', 'bi-info-circle-fill text-info');
                }
            });
        }

        if (lkpdCopyFromActiveBtn) {
            lkpdCopyFromActiveBtn.addEventListener('click', function () {
                const active = getIdeas();
                if (active.length === 0) {
                    setLkpdEditorError('Matriks aktif saat ini kosong, tidak ada data yang bisa disalin.');
                    switchLkpdTab('editor');
                    return;
                }
                draftPreset = active.map(item => normalizeIdeaItem(item, true, 'preset'));
                switchLkpdTab('editor');
                renderLkpdEditorRows();
                if (typeof notify === 'function') {
                    notify(`${draftPreset.length} ide dari Matriks Aktif disalin ke editor.`, 'bi-copy text-info');
                }
            });
        }

        if (lkpdResetSampleBtn) {
            lkpdResetSampleBtn.addEventListener('click', function () {
                if (draftPreset.length > 0 && !confirm('Isi editor saat ini akan diganti dengan 10 contoh ide LKPD 5 awal. Lanjutkan?')) {
                    return;
                }
                draftPreset = getInitialIdeasCopy();
                switchLkpdTab('editor');
                renderLkpdEditorRows();
                if (typeof notify === 'function') {
                    notify('10 contoh ide awal LKPD 5 dimuat ke editor.', 'bi-arrow-counterclockwise text-info');
                }
            });
        }

        if (lkpdFileInput) {
            lkpdFileInput.addEventListener('change', function () {
                const file = this.files && this.files[0];
                if (!file) return;
                if (lkpdSelectedFileName) lkpdSelectedFileName.textContent = file.name;
                setImportStatus('Membaca file...', 'warning');

                const reader = new FileReader();
                reader.onload = function (ev) {
                    const content = String(ev.target.result || '');
                    if (lkpdBulkTextarea) lkpdBulkTextarea.value = content;
                    const parsed = parseBulkIdeas(content);
                    if (parsed.items.length === 0) {
                        setImportStatus(`File "${file.name}" terbaca, namun tidak ditemukan baris ide yang valid.`, 'error');
                    } else {
                        setImportStatus(`File "${file.name}" siap diimpor (${parsed.items.length} ide ditemukan). Pilih "Ganti Isi Editor" atau "Tambah ke Editor".`, 'success');
                    }
                };
                reader.onerror = function () {
                    setImportStatus(`Gagal membaca file "${file.name}". Pastikan file berupa teks CSV, JSON, atau TXT.`, 'error');
                };
                reader.readAsText(file, 'UTF-8');
            });
        }

        function runBulkImport(mode) {
            setImportStatus('');
            const raw = lkpdBulkTextarea ? lkpdBulkTextarea.value : '';
            const parsed = parseBulkIdeas(raw);

            if (parsed.items.length === 0) {
                setImportStatus('Tidak ada baris ide valid yang ditemukan. Periksa teks atau file yang dimasukkan.', 'error');
                if (lkpdBulkTextarea) lkpdBulkTextarea.focus();
                return;
            }

            if (mode === 'replace') {
                draftPreset = parsed.items;
            } else {
                draftPreset = draftPreset.concat(parsed.items);
            }

            renderLkpdEditorRows();
            switchLkpdTab('editor');

            const note = parsed.defaultedCount > 0
                ? ` (${parsed.defaultedCount} ide memakai skor awal 3/3 yang bisa langsung Anda ubah)`
                : '';
            if (typeof notify === 'function') {
                notify(`${parsed.items.length} ide berhasil dimuat ke editor${note}.`);
            }
        }

        if (lkpdImportReplaceBtn) lkpdImportReplaceBtn.addEventListener('click', () => runBulkImport('replace'));
        if (lkpdImportAppendBtn) lkpdImportAppendBtn.addEventListener('click', () => runBulkImport('append'));

        if (lkpdExportJsonBtn) {
            lkpdExportJsonBtn.addEventListener('click', function () {
                if (!validateDraftRows()) {
                    switchLkpdTab('editor');
                    return;
                }
                if (draftPreset.length === 0) {
                    setImportStatus('Editor kosong. Tambahkan minimal 1 ide sebelum export preset.', 'warning');
                    return;
                }
                exportPresetToJson(draftPreset, 'stokin_preset_lkpd.json');
                if (typeof notify === 'function') notify('Preset LKPD diunduh sebagai JSON.');
            });
        }

        if (lkpdExportCsvBtn) {
            lkpdExportCsvBtn.addEventListener('click', function () {
                if (!validateDraftRows()) {
                    switchLkpdTab('editor');
                    return;
                }
                if (draftPreset.length === 0) {
                    setImportStatus('Editor kosong. Tambahkan minimal 1 ide sebelum export CSV.', 'warning');
                    return;
                }
                exportIdeasToCsv(draftPreset, 'stokin_preset_lkpd.csv');
                if (typeof notify === 'function') notify('Preset LKPD diunduh sebagai CSV.');
            });
        }

        if (lkpdSavePresetOnlyBtn) {
            lkpdSavePresetOnlyBtn.addEventListener('click', function () {
                if (!validateDraftRows()) {
                    switchLkpdTab('editor');
                    return;
                }
                const saved = savePreset(draftPreset);
                draftPreset = saved.map(i => ({ ...i }));
                updateLkpdSummary();
                if (typeof notify === 'function') {
                    notify(`Preset LKPD disimpan (${saved.length} ide) tanpa mengubah data matriks aktif.`);
                }
            });
        }

        if (lkpdAppendActiveBtn) {
            lkpdAppendActiveBtn.addEventListener('click', function () {
                if (!validateDraftRows()) {
                    switchLkpdTab('editor');
                    return;
                }
                if (draftPreset.length === 0) {
                    setLkpdEditorError('Daftar editor masih kosong. Tambahkan minimal 1 ide untuk ditambahkan ke matriks.');
                    switchLkpdTab('editor');
                    return;
                }
                savePreset(draftPreset);
                const additions = draftPreset.map(item => normalizeIdeaItem(item, true, 'id'));
                const merged = additions.concat(getIdeas());
                const savedIdeas = saveIdeas(merged);
                setIdeas(savedIdeas);
                onDataChanged();

                const modalInstance = bootstrap.Modal.getInstance(lkpdModalEl);
                if (modalInstance) modalInstance.hide();
                if (typeof notify === 'function') {
                    notify(`${additions.length} ide revisi LKPD ditambahkan ke matriks aktif.`);
                }
            });
        }

        if (lkpdReplaceActiveBtn) {
            lkpdReplaceActiveBtn.addEventListener('click', function () {
                if (!validateDraftRows()) {
                    switchLkpdTab('editor');
                    return;
                }
                if (draftPreset.length === 0) {
                    if (!confirm('Daftar editor kosong. Menerapkan sekarang akan menghapus seluruh data aktif di matriks. Lanjutkan?')) {
                        return;
                    }
                    savePreset([]);
                    saveIdeas([]);
                    setIdeas([]);
                    onDataChanged();

                    const modalInstance = bootstrap.Modal.getInstance(lkpdModalEl);
                    if (modalInstance) modalInstance.hide();
                    if (typeof notify === 'function') {
                        notify('Data lama dihapus. Preset dan matriks kini kosong.', 'bi-trash3-fill text-secondary');
                    }
                    return;
                }

                savePreset(draftPreset);
                const nextActive = draftPreset.map(item => normalizeIdeaItem(item, true, 'id'));
                const savedIdeas = saveIdeas(nextActive);
                setIdeas(savedIdeas);
                onDataChanged();

                const modalInstance = bootstrap.Modal.getInstance(lkpdModalEl);
                if (modalInstance) modalInstance.hide();
                if (typeof notify === 'function') {
                    notify(`Data sebelumnya diganti dengan ${savedIdeas.length} ide revisi LKPD!`);
                }
            });
        }

        function openLkpdModal() {
            if (!lkpdModalEl) return;
            draftPreset = loadPreset().map(item => ({ ...item }));
            if (lkpdBulkTextarea) lkpdBulkTextarea.value = '';
            if (lkpdFileInput) lkpdFileInput.value = '';
            if (lkpdSelectedFileName) lkpdSelectedFileName.textContent = 'Belum ada file dipilih';
            setImportStatus('');
            switchLkpdTab('editor');
            renderLkpdEditorRows();

            const modalInstance = bootstrap.Modal.getOrCreateInstance(lkpdModalEl);
            modalInstance.show();
        }

        // Hubungkan tombol header "Revisi & Muat LKPD" dan tombol di Empty State
        const btnLoadDefault = document.getElementById('btnLoadDefault');
        const btnLoadDefaultEmpty = document.getElementById('btnLoadDefaultEmpty');
        if (btnLoadDefault) btnLoadDefault.addEventListener('click', openLkpdModal);
        if (btnLoadDefaultEmpty) btnLoadDefaultEmpty.addEventListener('click', openLkpdModal);

        // Listener sinkronisasi antar-tab
        window.addEventListener('storage', function (e) {
            if (e.key === STORAGE_KEY) {
                setIdeas(loadIdeas());
                onDataChanged();
            } else if (e.key === PRESET_STORAGE_KEY && lkpdModalEl && lkpdModalEl.classList.contains('show')) {
                draftPreset = loadPreset().map(item => ({ ...item }));
                renderLkpdEditorRows();
            } else if (e.key === THEME_STORAGE_KEY) {
                applyTheme(e.newValue || 'light', onThemeChange);
            }
        });

        return {
            openAddModal: function () {
                resetIdeaModalToCreate();
                bootstrap.Modal.getOrCreateInstance(ideaModalEl).show();
            },
            openEditModal: openEditModal,
            openLkpdModal: openLkpdModal
        };
    }

    window.StokIn = {
        STORAGE_KEY,
        PRESET_STORAGE_KEY,
        THEME_STORAGE_KEY,
        INITIAL_LKPD_IDEAS,
        evaluateIdea,
        escapeHtml,
        loadIdeas,
        saveIdeas,
        loadPreset,
        savePreset,
        parseBulkIdeas,
        exportIdeasToCsv,
        exportPresetToJson,
        getSavedTheme,
        applyTheme,
        animateValue,
        initAppControllers
    };
})(window);
