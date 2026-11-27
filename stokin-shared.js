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
    // QUANTITY REPORT ENGINE & MULTI-FORMAT EXPORT
    // ==========================================
    function formatReportTimestamp(date = new Date()) {
        try {
            return new Intl.DateTimeFormat('id-ID', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }).format(date);
        } catch (e) {
            return date.toISOString().slice(0, 16).replace('T', ' ');
        }
    }

    function computeIdeasReport(list) {
        const cleanIdeas = (Array.isArray(list) ? list : [])
            .map(item => normalizeIdeaItem(item, false, 'rep'))
            .filter(item => item.name.length > 0);

        const totalIdeas = cleanIdeas.length;
        let sumFeasibility = 0;
        let sumImpact = 0;
        let sumTotalScore = 0;
        let minScore = totalIdeas > 0 ? Infinity : 0;
        let maxScore = totalIdeas > 0 ? -Infinity : 0;

        const feasQty = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        const impactQty = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        const totalScoreQty = {};
        for (let s = 2; s <= 10; s++) totalScoreQty[s] = 0;

        const quadMap = {
            Q1: { key: 'Q1', title: '⭐ Q1: Prioritas Utama', shortLabel: 'Q1: Prioritas Utama', criteria: 'Feas >= 4 & Impact >= 4', count: 0, sumScore: 0, badgeClass: 'badge-q1', barColor: 'var(--q1-emerald)' },
            Q2: { key: 'Q2', title: '💡 Q2: Potensi Tinggi', shortLabel: 'Q2: Potensi Tinggi', criteria: 'Feas < 4 & Impact >= 4', count: 0, sumScore: 0, badgeClass: 'badge-q2', barColor: 'var(--q2-blue)' },
            Q3: { key: 'Q3', title: '⚠️ Q3: Pertimbangan', shortLabel: 'Q3: Pertimbangan', criteria: 'Feas >= 4 & Impact < 4', count: 0, sumScore: 0, badgeClass: 'badge-q3', barColor: 'var(--q3-amber)' },
            Q4: { key: 'Q4', title: '💤 Q4: Tunda / Buang', shortLabel: 'Q4: Tunda / Buang', criteria: 'Feas < 4 & Impact < 4', count: 0, sumScore: 0, badgeClass: 'badge-q4', barColor: 'var(--q4-slate)' }
        };

        const enriched = cleanIdeas.map((item, idx) => {
            const ev = evaluateIdea(item.feasibility, item.impact);
            sumFeasibility += item.feasibility;
            sumImpact += item.impact;
            sumTotalScore += ev.totalScore;
            if (ev.totalScore < minScore) minScore = ev.totalScore;
            if (ev.totalScore > maxScore) maxScore = ev.totalScore;

            feasQty[item.feasibility] = (feasQty[item.feasibility] || 0) + 1;
            impactQty[item.impact] = (impactQty[item.impact] || 0) + 1;
            totalScoreQty[ev.totalScore] = (totalScoreQty[ev.totalScore] || 0) + 1;

            const qBucket = quadMap[ev.quadrantKey];
            if (qBucket) {
                qBucket.count += 1;
                qBucket.sumScore += ev.totalScore;
            }

            return {
                ...item,
                originalIndex: idx,
                totalScore: ev.totalScore,
                quadrant: ev.quadrant,
                quadrantKey: ev.quadrantKey,
                badgeClass: ev.badgeClass,
                advice: ev.advice
            };
        });

        enriched.sort((a, b) => {
            if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
            if (b.impact !== a.impact) return b.impact - a.impact;
            if (b.feasibility !== a.feasibility) return b.feasibility - a.feasibility;
            return a.originalIndex - b.originalIndex;
        });

        const rankedIdeas = enriched.map((item, idx) => ({ ...item, rank: idx + 1 }));
        const toPct = (count) => totalIdeas > 0 ? Math.round((count / totalIdeas) * 100) : 0;

        const scaleLabels = {
            5: 'Skor 5 (Sangat Baik)',
            4: 'Skor 4 (Baik)',
            3: 'Skor 3 (Sedang)',
            2: 'Skor 2 (Kurang)',
            1: 'Skor 1 (Sangat Kurang)'
        };

        const scoreScale = [5, 4, 3, 2, 1].map(score => ({
            score,
            label: scaleLabels[score],
            feasCount: feasQty[score],
            feasPct: toPct(feasQty[score]),
            impactCount: impactQty[score],
            impactPct: toPct(impactQty[score])
        }));

        const totalScoreDistribution = [];
        for (let totalScore = 10; totalScore >= 2; totalScore--) {
            totalScoreDistribution.push({
                totalScore,
                count: totalScoreQty[totalScore],
                pct: toPct(totalScoreQty[totalScore])
            });
        }

        const quadrants = ['Q1', 'Q2', 'Q3', 'Q4'].map(key => {
            const q = quadMap[key];
            const avgScore = q.count > 0 ? Number((q.sumScore / q.count).toFixed(2)) : 0;
            return {
                ...q,
                pct: toPct(q.count),
                avgScore,
                avgScoreText: q.count > 0 ? avgScore.toFixed(2) : '0.00'
            };
        });

        let dominantQuadrant = null;
        if (totalIdeas > 0) {
            dominantQuadrant = quadrants.reduce((best, curr) => (curr.count > best.count ? curr : best), quadrants[0]);
        }

        const avgFeasibility = totalIdeas > 0 ? Number((sumFeasibility / totalIdeas).toFixed(2)) : 0;
        const avgImpact = totalIdeas > 0 ? Number((sumImpact / totalIdeas).toFixed(2)) : 0;
        const avgTotalScore = totalIdeas > 0 ? Number((sumTotalScore / totalIdeas).toFixed(2)) : 0;

        return {
            generatedAtLabel: formatReportTimestamp(),
            totalIdeas,
            sumFeasibility,
            maxFeasibility: totalIdeas * 5,
            avgFeasibility,
            avgFeasibilityText: avgFeasibility.toFixed(2),
            sumImpact,
            maxImpact: totalIdeas * 5,
            avgImpact,
            avgImpactText: avgImpact.toFixed(2),
            sumTotalScore,
            maxTotalScore: totalIdeas * 10,
            avgTotalScore,
            avgTotalScoreText: avgTotalScore.toFixed(2),
            minScore,
            maxScore,
            quadrants,
            dominantQuadrant,
            scoreScale,
            totalScoreDistribution,
            rankedIdeas,
            topIdea: rankedIdeas[0] || null
        };
    }

    function csvEscapeCell(val) {
        return `"${String(val === null || val === undefined ? '' : val).replace(/"/g, '""')}"`;
    }

    function exportReportToCsv(list, filename = 'stokin_laporan_quantity_nilai.csv') {
        const rep = computeIdeasReport(list);
        const lines = [];
        const addRow = (cols) => lines.push(cols.map(csvEscapeCell).join(','));

        addRow(['LAPORAN HASIL & QUANTITY NILAI IDE MATRIKS PRIORITAS STOKIN']);
        addRow(['Tanggal Ekspor', rep.generatedAtLabel]);
        lines.push('');

        addRow(['BAGIAN 1: RINGKASAN AKUMULASI & RATA-RATA NILAI']);
        addRow(['Metrik', 'Nilai / Quantity', 'Keterangan']);
        addRow(['Jumlah Total Ide', rep.totalIdeas, 'Total fitur aktif yang dievaluasi']);
        addRow(['Total Poin Feasibility (X)', `${rep.sumFeasibility} / ${rep.maxFeasibility}`, `Rata-rata ${rep.avgFeasibilityText} dari 5`]);
        addRow(['Total Poin Impact (Y)', `${rep.sumImpact} / ${rep.maxImpact}`, `Rata-rata ${rep.avgImpactText} dari 5`]);
        addRow(['Akumulasi Total Skor (X+Y)', `${rep.sumTotalScore} / ${rep.maxTotalScore}`, `Rata-rata ${rep.avgTotalScoreText} dari 10`]);
        addRow(['Rentang Skor Gabungan', rep.totalIdeas > 0 ? `${rep.minScore} s.d. ${rep.maxScore}` : '0', 'Skor terendah hingga tertinggi']);
        addRow(['Kuadran Dominan', rep.dominantQuadrant ? `${rep.dominantQuadrant.shortLabel} (${rep.dominantQuadrant.count} ide / ${rep.dominantQuadrant.pct}%)` : '-', 'Kuadran dengan jumlah ide terbanyak']);
        addRow(['Rekomendasi MVP #1', rep.topIdea ? `${rep.topIdea.name} (Skor ${rep.topIdea.totalScore}/10)` : '-', 'Prioritas implementasi teratas']);
        lines.push('');

        addRow(['BAGIAN 2: QUANTITY IDE PER KUADRAN']);
        addRow(['Kuadran', 'Kriteria Matriks', 'Quantity (Jumlah Ide)', 'Persentase', 'Total Poin Skor', 'Rata-rata Skor']);
        rep.quadrants.forEach(q => {
            addRow([q.shortLabel, q.criteria, q.count, `${q.pct}%`, q.sumScore, q.avgScoreText]);
        });
        lines.push('');

        addRow(['BAGIAN 3: QUANTITY NILAI PER SKALA SKOR (1-5)']);
        addRow(['Skala Nilai', 'Kategori', 'Qty Feasibility (X)', '% Feasibility', 'Qty Impact (Y)', '% Impact']);
        rep.scoreScale.forEach(row => {
            addRow([row.score, row.label, row.feasCount, `${row.feasPct}%`, row.impactCount, `${row.impactPct}%`]);
        });
        lines.push('');

        addRow(['BAGIAN 4: QUANTITY IDE BERDASARKAN TOTAL SKOR GABUNGAN (2-10)']);
        addRow(['Total Skor (X + Y)', 'Quantity (Jumlah Ide)', 'Persentase']);
        rep.totalScoreDistribution.forEach(item => {
            addRow([`${item.totalScore} / 10`, item.count, `${item.pct}%`]);
        });
        lines.push('');

        addRow(['BAGIAN 5: DAFTAR PERINGKAT LENGKAP IDE FITUR']);
        addRow(['Peringkat', 'Nama Ide Fitur', 'Feasibility (X)', 'Impact (Y)', 'Total Skor', 'Kuadran', 'Rekomendasi']);
        rep.rankedIdeas.forEach(item => {
            addRow([item.rank, item.name, item.feasibility, item.impact, item.totalScore, item.quadrant, item.advice]);
        });

        downloadFile('\uFEFF' + lines.join('\n'), filename, 'text/csv;charset=utf-8;');
        return rep;
    }

    function buildPrintableReportBodyHtml(rep) {
        const scoreRowsHtml = rep.scoreScale.map(row => `
            <tr>
                <td><strong>Skor ${row.score}</strong> <span class="rep-muted">(${escapeHtml(row.label.replace(/^Skor \d+\s*/, ''))})</span></td>
                <td class="rep-num">${row.feasCount} ide (${row.feasPct}%)</td>
                <td class="rep-num">${row.impactCount} ide (${row.impactPct}%)</td>
            </tr>
        `).join('');

        const quadRowsHtml = rep.quadrants.map(q => `
            <tr>
                <td><strong>${escapeHtml(q.title)}</strong><br><span class="rep-muted">${escapeHtml(q.criteria)}</span></td>
                <td class="rep-num"><strong>${q.count}</strong> ide</td>
                <td class="rep-num">${q.pct}%</td>
                <td class="rep-num">${q.sumScore} pts</td>
                <td class="rep-num">${q.avgScoreText}</td>
            </tr>
        `).join('');

        const totalDistChipsHtml = rep.totalScoreDistribution
            .filter(d => d.count > 0)
            .map(d => `<span class="rep-chip"><strong>Skor ${d.totalScore}/10:</strong> ${d.count} ide (${d.pct}%)</span>`)
            .join('') || '<span class="rep-muted">Belum ada data skor.</span>';

        const rankedRowsHtml = rep.rankedIdeas.map(item => `
            <tr>
                <td class="rep-num">#${item.rank}</td>
                <td><strong>${escapeHtml(item.name)}</strong><br><span class="rep-muted">${escapeHtml(item.advice)}</span></td>
                <td class="rep-num">${item.feasibility} / 5</td>
                <td class="rep-num">${item.impact} / 5</td>
                <td class="rep-num"><strong>${item.totalScore}</strong></td>
                <td>${escapeHtml(item.quadrant)}</td>
            </tr>
        `).join('');

        return `
            <div class="rep-doc-wrap">
                <div class="rep-header">
                    <div>
                        <div class="rep-brand">STOKIN &bull; LAPORAN VALIDASI LKPD KEWIRAUSAHAAN</div>
                        <h1 class="rep-title">Laporan Hasil &amp; Rekapitulasi Quantity Nilai Ide</h1>
                        <p class="rep-sub">Matriks Prioritas Feasibility (X) vs Impact (Y) untuk ${rep.totalIdeas} ide fitur terdaftar</p>
                    </div>
                    <div class="rep-meta">
                        <div><strong>Tanggal Cetak:</strong> ${escapeHtml(rep.generatedAtLabel)}</div>
                        <div><strong>Total Ide:</strong> ${rep.totalIdeas} item</div>
                    </div>
                </div>

                <div class="rep-kpis">
                    <div class="rep-kpi">
                        <div class="rep-kpi-label">Total Poin Feasibility (X)</div>
                        <div class="rep-kpi-val">${rep.sumFeasibility} / ${rep.maxFeasibility}</div>
                        <div class="rep-kpi-note">Rata-rata ${rep.avgFeasibilityText} dari 5</div>
                    </div>
                    <div class="rep-kpi">
                        <div class="rep-kpi-label">Total Poin Impact (Y)</div>
                        <div class="rep-kpi-val">${rep.sumImpact} / ${rep.maxImpact}</div>
                        <div class="rep-kpi-note">Rata-rata ${rep.avgImpactText} dari 5</div>
                    </div>
                    <div class="rep-kpi">
                        <div class="rep-kpi-label">Akumulasi Total Skor</div>
                        <div class="rep-kpi-val">${rep.sumTotalScore} / ${rep.maxTotalScore}</div>
                        <div class="rep-kpi-note">Rata-rata ${rep.avgTotalScoreText} dari 10</div>
                    </div>
                    <div class="rep-kpi">
                        <div class="rep-kpi-label">Prioritas MVP #1</div>
                        <div class="rep-kpi-val">${rep.topIdea ? `${rep.topIdea.totalScore} / 10` : '-'}</div>
                        <div class="rep-kpi-note">${rep.topIdea ? escapeHtml(rep.topIdea.name) : 'Belum ada data'}</div>
                    </div>
                </div>

                <div class="rep-grid-2">
                    <div class="rep-box">
                        <h2 class="rep-h2">Quantity Nilai per Skala (1-5)</h2>
                        <table class="rep-table">
                            <thead>
                                <tr>
                                    <th>Skala Nilai</th>
                                    <th class="rep-num">Qty Feasibility (X)</th>
                                    <th class="rep-num">Qty Impact (Y)</th>
                                </tr>
                            </thead>
                            <tbody>${scoreRowsHtml}</tbody>
                        </table>
                        <div class="rep-subbox">
                            <div class="rep-sublabel">Quantity Berdasarkan Total Skor (X + Y):</div>
                            <div class="rep-chips">${totalDistChipsHtml}</div>
                        </div>
                    </div>

                    <div class="rep-box">
                        <h2 class="rep-h2">Quantity Ide per Kuadran (Q1-Q4)</h2>
                        <table class="rep-table">
                            <thead>
                                <tr>
                                    <th>Kuadran</th>
                                    <th class="rep-num">Qty</th>
                                    <th class="rep-num">%</th>
                                    <th class="rep-num">Poin</th>
                                    <th class="rep-num">Rata2</th>
                                </tr>
                            </thead>
                            <tbody>${quadRowsHtml}</tbody>
                        </table>
                    </div>
                </div>

                <div class="rep-box">
                    <h2 class="rep-h2">Daftar Peringkat Lengkap (${rep.totalIdeas} Ide)</h2>
                    <table class="rep-table">
                        <thead>
                            <tr>
                                <th class="rep-num">Rank</th>
                                <th>Nama Ide Fitur &amp; Rekomendasi</th>
                                <th class="rep-num">Feas (X)</th>
                                <th class="rep-num">Imp (Y)</th>
                                <th class="rep-num">Skor</th>
                                <th>Kuadran</th>
                            </tr>
                        </thead>
                        <tbody>${rankedRowsHtml || '<tr><td colspan="6">Belum ada data ide aktif.</td></tr>'}</tbody>
                    </table>
                </div>
            </div>
        `;
    }

    const REPORT_PRINT_CSS = `
        .rep-doc-wrap { font-family: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; line-height: 1.45; }
        .rep-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; border-bottom: 2px solid #0f766e; padding-bottom: 12px; margin-bottom: 16px; flex-wrap: wrap; }
        .rep-brand { font-size: 11px; font-weight: 700; letter-spacing: 0.06em; color: #0f766e; margin-bottom: 4px; }
        .rep-title { font-size: 20px; font-weight: 800; margin: 0 0 4px 0; color: #0f172a; }
        .rep-sub { font-size: 13px; color: #475569; margin: 0; }
        .rep-meta { font-size: 12px; color: #334155; text-align: right; }
        .rep-kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-bottom: 16px; }
        .rep-kpi { border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 12px; background: #f8fafc; }
        .rep-kpi-label { font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.03em; }
        .rep-kpi-val { font-size: 18px; font-weight: 800; color: #0f172a; margin: 4px 0 2px; }
        .rep-kpi-note { font-size: 11px; color: #475569; }
        .rep-grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-bottom: 16px; }
        .rep-box { border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px 14px; background: #ffffff; margin-bottom: 14px; break-inside: avoid; }
        .rep-grid-2 .rep-box { margin-bottom: 0; }
        .rep-h2 { font-size: 14px; font-weight: 700; margin: 0 0 10px 0; color: #0f766e; }
        .rep-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .rep-table th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.03em; color: #475569; border-bottom: 1.5px solid #cbd5e1; padding: 6px; background: #f8fafc; }
        .rep-table td { border-bottom: 1px solid #e2e8f0; padding: 6px; vertical-align: top; }
        .rep-num { text-align: center !important; font-variant-numeric: tabular-nums; white-space: nowrap; }
        .rep-muted { font-size: 11px; color: #64748b; }
        .rep-subbox { margin-top: 10px; padding-top: 8px; border-top: 1px dashed #cbd5e1; }
        .rep-sublabel { font-size: 11px; font-weight: 700; color: #334155; margin-bottom: 6px; }
        .rep-chips { display: flex; flex-wrap: wrap; gap: 6px; }
        .rep-chip { font-size: 11px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 3px 8px; }
        @media (max-width: 720px) { .rep-kpis, .rep-grid-2 { grid-template-columns: 1fr; } .rep-meta { text-align: left; } }
    `;

    function buildReportHtmlDocument(list) {
        const rep = computeIdeasReport(list);
        return `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Laporan Hasil Quantity Nilai Ide - StokIn</title>
    <style>
        body { margin: 24px auto; max-width: 980px; padding: 0 16px; background: #ffffff; }
        ${REPORT_PRINT_CSS}
        @media print { body { margin: 0; max-width: 100%; padding: 0; } }
    </style>
</head>
<body>
    ${buildPrintableReportBodyHtml(rep)}
</body>
</html>`;
    }

    function exportReportToHtml(list, filename = 'stokin_laporan_hasil_lkpd.html') {
        const rep = computeIdeasReport(list);
        downloadFile(buildReportHtmlDocument(list), filename, 'text/html;charset=utf-8;');
        return rep;
    }

    function buildReportPlainText(list) {
        const rep = computeIdeasReport(list);
        if (rep.totalIdeas === 0) {
            return 'LAPORAN HASIL STOKIN: Belum ada data ide aktif untuk dirangkum.';
        }

        const quadLines = rep.quadrants.map(q =>
            `- ${q.shortLabel}: ${q.count} ide (${q.pct}%) | Total Poin: ${q.sumScore} | Rata-rata: ${q.avgScoreText}`
        ).join('\n');

        const scaleLines = rep.scoreScale.map(s =>
            `- Skor ${s.score}: Feasibility = ${s.feasCount} ide (${s.feasPct}%) | Impact = ${s.impactCount} ide (${s.impactPct}%)`
        ).join('\n');

        const scoreDistLines = rep.totalScoreDistribution
            .filter(d => d.count > 0)
            .map(d => `- Total Skor ${d.totalScore}/10: ${d.count} ide (${d.pct}%)`)
            .join('\n');

        const rankedLines = rep.rankedIdeas.map(item =>
            `${item.rank}. ${item.name} | Feas: ${item.feasibility}/5 | Imp: ${item.impact}/5 | Total: ${item.totalScore}/10 | ${item.quadrant}`
        ).join('\n');

        return [
            'LAPORAN HASIL & QUANTITY NILAI IDE STOKIN',
            `Tanggal: ${rep.generatedAtLabel}`,
            '',
            '1. RINGKASAN AKUMULASI & RATA-RATA',
            `- Total Ide Terdaftar: ${rep.totalIdeas} ide`,
            `- Total Poin Feasibility (X): ${rep.sumFeasibility} / ${rep.maxFeasibility} (Rata-rata: ${rep.avgFeasibilityText})`,
            `- Total Poin Impact (Y): ${rep.sumImpact} / ${rep.maxImpact} (Rata-rata: ${rep.avgImpactText})`,
            `- Akumulasi Total Skor (X+Y): ${rep.sumTotalScore} / ${rep.maxTotalScore} (Rata-rata: ${rep.avgTotalScoreText})`,
            `- Rentang Skor: ${rep.minScore} s.d. ${rep.maxScore}`,
            `- Prioritas MVP #1: ${rep.topIdea ? `${rep.topIdea.name} (Skor ${rep.topIdea.totalScore}/10)` : '-'}`,
            '',
            '2. QUANTITY PER KUADRAN',
            quadLines,
            '',
            '3. QUANTITY PER SKALA SKOR (1-5)',
            scaleLines,
            '',
            '4. QUANTITY PER TOTAL SKOR (2-10)',
            scoreDistLines,
            '',
            '5. PERINGKAT LENGKAP IDE',
            rankedLines
        ].join('\n');
    }

    function copyReportSummary(list, notify) {
        const text = buildReportPlainText(list);
        const onDone = () => {
            if (typeof notify === 'function') notify('Ringkasan laporan quantity nilai disalin ke clipboard.');
        };
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            navigator.clipboard.writeText(text).then(onDone).catch(() => {
                fallbackCopyText(text);
                onDone();
            });
            return;
        }
        fallbackCopyText(text);
        onDone();
    }

    function fallbackCopyText(text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(ta);
    }

    function printReport(list) {
        const rep = computeIdeasReport(list);
        let sheet = document.getElementById('stokinPrintSheet');
        if (!sheet) {
            sheet = document.createElement('div');
            sheet.id = 'stokinPrintSheet';
            document.body.appendChild(sheet);
        }
        sheet.innerHTML = `<style>${REPORT_PRINT_CSS}</style>${buildPrintableReportBodyHtml(rep)}`;
        const cleanup = () => {
            if (sheet) sheet.innerHTML = '';
        };
        window.addEventListener('afterprint', cleanup, { once: true });
        window.print();
    }

    function runReportExportAction(act, list, notify) {
        const items = Array.isArray(list) ? list : [];
        if (items.length === 0) {
            if (typeof notify === 'function') notify('Belum ada data ide untuk diexport!', 'bi-exclamation-triangle-fill text-warning');
            return;
        }
        if (act === 'csv') {
            exportReportToCsv(items);
            if (typeof notify === 'function') notify('Laporan lengkap quantity nilai diexport ke CSV!');
        } else if (act === 'html') {
            exportReportToHtml(items);
            if (typeof notify === 'function') notify('Dokumen laporan HTML berhasil diunduh!');
        } else if (act === 'print') {
            printReport(items);
        } else if (act === 'copy') {
            copyReportSummary(items, notify);
        }
    }

    function renderQuantityReportSection(target, list, options = {}) {
        const container = typeof target === 'string' ? document.querySelector(target) : target;
        if (!container) return null;

        const notify = options.notify;
        const rep = computeIdeasReport(list);
        const showHeader = options.hideHeader !== true;
        const suffix = options.idSuffix || 'inline';

        const exportBarHtml = `
            <div class="d-flex flex-wrap align-items-center gap-2 report-action-bar">
                <button type="button" class="btn-modern-primary btn-sm js-rep-csv" data-rep-action="csv" ${rep.totalIdeas === 0 ? 'disabled' : ''}>
                    <i class="bi bi-file-earmark-spreadsheet"></i>
                    <span>Export Laporan CSV</span>
                </button>
                <button type="button" class="btn-modern-outline btn-sm js-rep-html" data-rep-action="html" ${rep.totalIdeas === 0 ? 'disabled' : ''}>
                    <i class="bi bi-filetype-html" style="color: var(--stokin-teal-600);"></i>
                    <span>Unduh HTML</span>
                </button>
                <button type="button" class="btn-modern-outline btn-sm js-rep-print" data-rep-action="print" ${rep.totalIdeas === 0 ? 'disabled' : ''}>
                    <i class="bi bi-printer" style="color: var(--stokin-teal-600);"></i>
                    <span>Cetak / PDF</span>
                </button>
                <button type="button" class="btn btn-sm btn-outline-secondary d-inline-flex align-items-center justify-content-center gap-1 js-rep-copy" data-rep-action="copy" style="border-radius: 9px; color: var(--stokin-text-secondary); border-color: var(--stokin-border);" ${rep.totalIdeas === 0 ? 'disabled' : ''}>
                    <i class="bi bi-clipboard-check"></i>
                    <span>Salin Teks</span>
                </button>
            </div>
        `;

        const headerHtml = showHeader ? `
            <div class="modern-card-header">
                <div class="d-flex align-items-center gap-2 min-w-0">
                    <div class="rounded-3 d-flex align-items-center justify-content-center stokin-teal-chip flex-shrink-0" style="width: 38px; height: 38px;">
                        <i class="bi bi-clipboard-data-fill fs-5"></i>
                    </div>
                    <div class="min-w-0">
                        <h2 class="h6 mb-0 fw-bold" style="color: var(--stokin-text-primary);">Laporan Hasil &amp; Quantity Nilai Ide</h2>
                        <small class="text-muted">Rekapitulasi ${rep.totalIdeas} ide: akumulasi poin, frekuensi skala 1-5, &amp; distribusi kuadran</small>
                    </div>
                </div>
                ${exportBarHtml}
            </div>
        ` : `<div class="mb-3 d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-2">
            <small class="text-muted">Rekapitulasi <strong>${rep.totalIdeas}</strong> ide aktif siap ekspor</small>
            ${exportBarHtml}
        </div>`;

        if (rep.totalIdeas === 0) {
            container.innerHTML = `
                <div class="${showHeader ? 'modern-card' : ''}" id="quantityReportCard-${suffix}">
                    ${headerHtml}
                    <div class="p-4 text-center">
                        <i class="bi bi-bar-chart-line fs-2 text-muted d-block mb-2"></i>
                        <div class="fw-bold small mb-1" style="color: var(--stokin-text-primary);">Belum Ada Data untuk Laporan Quantity Nilai</div>
                        <p class="small text-muted mb-0">Tambahkan minimal 1 ide fitur atau muat data LKPD untuk melihat rekapitulasi nilai dan mengekspor laporan.</p>
                    </div>
                </div>
            `;
        } else {
            const scaleRowsHtml = rep.scoreScale.map(row => `
                <tr>
                    <td class="fw-semibold" style="color: var(--stokin-text-primary);">
                        <span class="badge border me-1" style="background: var(--stokin-badge-bg); color: var(--stokin-badge-text); border-color: var(--stokin-border) !important;">${row.score}</span>
                        <span class="small text-muted d-none d-sm-inline">${escapeHtml(row.label.replace(/^Skor \d+\s*/, ''))}</span>
                    </td>
                    <td>
                        <div class="d-flex align-items-center justify-content-between gap-2 small">
                            <span class="fw-bold report-teal-val" style="font-variant-numeric: tabular-nums;">${row.feasCount} ide</span>
                            <span class="text-muted">${row.feasPct}%</span>
                        </div>
                        <div class="report-mini-track mt-1">
                            <div class="report-mini-fill" style="width: ${row.feasPct}%; background: var(--stokin-teal-600);"></div>
                        </div>
                    </td>
                    <td>
                        <div class="d-flex align-items-center justify-content-between gap-2 small">
                            <span class="fw-bold report-blue-val" style="font-variant-numeric: tabular-nums;">${row.impactCount} ide</span>
                            <span class="text-muted">${row.impactPct}%</span>
                        </div>
                        <div class="report-mini-track mt-1">
                            <div class="report-mini-fill" style="width: ${row.impactPct}%; background: var(--q2-blue);"></div>
                        </div>
                    </td>
                </tr>
            `).join('');

            const quadRowsHtml = rep.quadrants.map(q => `
                <tr>
                    <td>
                        <div class="fw-semibold small" style="color: var(--stokin-text-primary);">${escapeHtml(q.title)}</div>
                        <small class="text-muted" style="font-size: 0.7rem;">${escapeHtml(q.criteria)}</small>
                    </td>
                    <td class="text-center">
                        <span class="fw-bold" style="color: var(--stokin-text-primary); font-variant-numeric: tabular-nums;">${q.count}</span>
                        <small class="text-muted d-block" style="font-size: 0.7rem;">${q.pct}%</small>
                    </td>
                    <td class="text-center">
                        <span class="fw-bold" style="color: var(--stokin-text-primary); font-variant-numeric: tabular-nums;">${q.sumScore}</span>
                        <small class="text-muted d-block" style="font-size: 0.7rem;">avg ${q.avgScoreText}</small>
                    </td>
                </tr>
            `).join('');

            const totalScoreChips = rep.totalScoreDistribution
                .filter(d => d.count > 0)
                .map(d => `
                    <span class="report-score-chip">
                        <strong>Skor ${d.totalScore}/10</strong>
                        <span>${d.count} ide (${d.pct}%)</span>
                    </span>
                `).join('');

            container.innerHTML = `
                <div class="${showHeader ? 'modern-card' : ''}" id="quantityReportCard-${suffix}">
                    ${headerHtml}
                    <div class="${showHeader ? 'p-3 p-md-4' : ''}">
                        <!-- 4 Metric Totals -->
                        <div class="row g-2 g-md-3 mb-3">
                            <div class="col-6 col-lg-3">
                                <div class="report-summary-tile h-100">
                                    <div class="report-summary-label">Total Poin Feasibility (X)</div>
                                    <div class="report-summary-num report-teal-val">${rep.sumFeasibility} <span class="fs-6 fw-semibold text-muted">/ ${rep.maxFeasibility}</span></div>
                                    <small class="text-muted">Rata-rata ${rep.avgFeasibilityText} dari 5.00</small>
                                </div>
                            </div>
                            <div class="col-6 col-lg-3">
                                <div class="report-summary-tile h-100">
                                    <div class="report-summary-label">Total Poin Impact (Y)</div>
                                    <div class="report-summary-num report-blue-val">${rep.sumImpact} <span class="fs-6 fw-semibold text-muted">/ ${rep.maxImpact}</span></div>
                                    <small class="text-muted">Rata-rata ${rep.avgImpactText} dari 5.00</small>
                                </div>
                            </div>
                            <div class="col-6 col-lg-3">
                                <div class="report-summary-tile h-100">
                                    <div class="report-summary-label">Akumulasi Total Skor</div>
                                    <div class="report-summary-num" style="color: var(--stokin-text-primary);">${rep.sumTotalScore} <span class="fs-6 fw-semibold text-muted">/ ${rep.maxTotalScore}</span></div>
                                    <small class="text-muted">Rata-rata ${rep.avgTotalScoreText} / 10 (Min ${rep.minScore} - Maks ${rep.maxScore})</small>
                                </div>
                            </div>
                            <div class="col-6 col-lg-3">
                                <div class="report-summary-tile h-100">
                                    <div class="report-summary-label">Kuadran Dominan &amp; MVP</div>
                                    <div class="fw-bold small mt-1 mb-1 text-truncate" style="color: var(--stokin-text-primary);" title="${rep.dominantQuadrant ? escapeHtml(rep.dominantQuadrant.shortLabel) : '-'}">
                                        ${rep.dominantQuadrant ? `${escapeHtml(rep.dominantQuadrant.shortLabel)} (${rep.dominantQuadrant.count})` : '-'}
                                    </div>
                                    <small class="text-muted d-block text-truncate" title="${rep.topIdea ? escapeHtml(rep.topIdea.name) : '-'}">
                                        MVP #1: ${rep.topIdea ? `${escapeHtml(rep.topIdea.name)} (${rep.topIdea.totalScore}/10)` : '-'}
                                    </small>
                                </div>
                            </div>
                        </div>

                        <!-- Quantity Breakdown Tables -->
                        <div class="row g-3">
                            <div class="col-12 col-lg-6">
                                <div class="p-3 rounded-3 border h-100" style="background: var(--stokin-card-subtle); border-color: var(--stokin-border) !important;">
                                    <h3 class="h6 fw-bold mb-2 d-flex align-items-center gap-2" style="color: var(--stokin-text-primary); font-size: 0.9rem;">
                                        <i class="bi bi-sliders2" style="color: var(--stokin-teal-600);"></i>
                                        <span>Quantity per Nilai Skala (1-5)</span>
                                    </h3>
                                    <div class="table-responsive">
                                        <table class="table table-sm mb-0 report-dist-table">
                                            <thead>
                                                <tr>
                                                    <th>Skala</th>
                                                    <th>Qty Feasibility (X)</th>
                                                    <th>Qty Impact (Y)</th>
                                                </tr>
                                            </thead>
                                            <tbody>${scaleRowsHtml}</tbody>
                                        </table>
                                    </div>
                                    <div class="mt-3 pt-2 border-top" style="border-color: var(--stokin-border) !important;">
                                        <div class="small fw-semibold mb-2" style="color: var(--stokin-text-secondary);">Quantity per Total Skor (X + Y):</div>
                                        <div class="d-flex flex-wrap gap-2">${totalScoreChips}</div>
                                    </div>
                                </div>
                            </div>

                            <div class="col-12 col-lg-6">
                                <div class="p-3 rounded-3 border h-100" style="background: var(--stokin-card-subtle); border-color: var(--stokin-border) !important;">
                                    <h3 class="h6 fw-bold mb-2 d-flex align-items-center gap-2" style="color: var(--stokin-text-primary); font-size: 0.9rem;">
                                        <i class="bi bi-pie-chart-fill text-primary"></i>
                                        <span>Quantity Ide &amp; Akumulasi per Kuadran</span>
                                    </h3>
                                    <div class="table-responsive">
                                        <table class="table table-sm mb-0 report-dist-table">
                                            <thead>
                                                <tr>
                                                    <th>Kuadran</th>
                                                    <th class="text-center">Quantity</th>
                                                    <th class="text-center">Total Poin</th>
                                                </tr>
                                            </thead>
                                            <tbody>${quadRowsHtml}</tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        container.querySelectorAll('[data-rep-action]').forEach(btn => {
            btn.addEventListener('click', function () {
                runReportExportAction(this.getAttribute('data-rep-action'), list, notify);
            });
        });

        return rep;
    }

    function ensureReportModalMarkup() {
        if (document.getElementById('stokinReportModal')) return;
        const wrapper = document.createElement('div');
        wrapper.innerHTML = `
            <div class="modal fade" id="stokinReportModal" tabindex="-1" aria-labelledby="stokinReportModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-xl modal-fullscreen-sm-down modal-dialog-centered modal-dialog-scrollable">
                    <div class="modal-content border shadow-elevated" style="border-radius: var(--radius-lg); border-color: var(--stokin-border) !important;">
                        <div class="modal-header" style="border-bottom: 1px solid var(--stokin-border);">
                            <div class="d-flex align-items-center gap-2 min-w-0">
                                <div class="rounded-3 d-flex align-items-center justify-content-center stokin-teal-chip flex-shrink-0" style="width: 38px; height: 38px;">
                                    <i class="bi bi-clipboard-data-fill fs-5"></i>
                                </div>
                                <div class="min-w-0">
                                    <h5 class="modal-title h6 mb-0 fw-bold" id="stokinReportModalLabel" style="color: var(--stokin-text-primary);">
                                        Laporan Hasil &amp; Quantity Nilai Ide
                                    </h5>
                                    <small class="text-muted" style="font-size: 0.74rem;">
                                        Rekapitulasi nilai lengkap siap cetak atau ekspor ke Excel/HTML/PDF
                                    </small>
                                </div>
                            </div>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Tutup"></button>
                        </div>
                        <div class="modal-body p-3 p-md-4" id="stokinReportModalBody"></div>
                        <div class="modal-footer" style="border-top: 1px solid var(--stokin-border);">
                            <button type="button" class="btn btn-outline-secondary btn-sm px-3" data-bs-dismiss="modal" style="border-radius: 9px; min-height: 40px; color: var(--stokin-text-secondary); border-color: var(--stokin-border);">
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(wrapper.firstElementChild);
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
        ensureReportModalMarkup();

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

        function openReportModal() {
            const modalEl = document.getElementById('stokinReportModal');
            const bodyEl = document.getElementById('stokinReportModalBody');
            if (!modalEl || !bodyEl) return;
            renderQuantityReportSection(bodyEl, getIdeas(), {
                notify: notify,
                hideHeader: true,
                idSuffix: 'modal'
            });
            bootstrap.Modal.getOrCreateInstance(modalEl).show();
        }

        const reportActionBindings = [
            ['btnExportReportCSV', 'csv'],
            ['btnExportReportHTML', 'html'],
            ['btnPrintReport', 'print'],
            ['btnCopyReport', 'copy']
        ];
        reportActionBindings.forEach(([elId, act]) => {
            const btn = document.getElementById(elId);
            if (btn) {
                btn.addEventListener('click', function () {
                    runReportExportAction(act, getIdeas(), notify);
                });
            }
        });

        // Hubungkan tombol header "Revisi & Muat LKPD", tombol Empty State, dan pemicu Laporan
        const btnLoadDefault = document.getElementById('btnLoadDefault');
        const btnLoadDefaultEmpty = document.getElementById('btnLoadDefaultEmpty');
        if (btnLoadDefault) btnLoadDefault.addEventListener('click', openLkpdModal);
        if (btnLoadDefaultEmpty) btnLoadDefaultEmpty.addEventListener('click', openLkpdModal);
        document.querySelectorAll('.js-open-report-modal').forEach(btn => {
            btn.addEventListener('click', openReportModal);
        });

        // Listener sinkronisasi antar-tab
        window.addEventListener('storage', function (e) {
            if (e.key === STORAGE_KEY) {
                setIdeas(loadIdeas());
                onDataChanged();
                const repModal = document.getElementById('stokinReportModal');
                const repBody = document.getElementById('stokinReportModalBody');
                if (repModal && repModal.classList.contains('show') && repBody) {
                    renderQuantityReportSection(repBody, getIdeas(), { notify: notify, hideHeader: true, idSuffix: 'modal' });
                }
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
            openLkpdModal: openLkpdModal,
            openReportModal: openReportModal
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
        computeIdeasReport,
        exportReportToCsv,
        exportReportToHtml,
        buildReportHtmlDocument,
        buildReportPlainText,
        copyReportSummary,
        printReport,
        renderQuantityReportSection,
        getSavedTheme,
        applyTheme,
        animateValue,
        initAppControllers
    };
})(window);
