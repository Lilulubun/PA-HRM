# Hasil Pengujian Hardening — PA-HRM PoC

Tanggal: 2026-10-02
Lingkup: Verifikasi Kutipan Persis, Safety & Failure Gate, Atomic Finalization & Audit Trail, Benchmark Traversal Graf.
Lingkungan: Real Next.js app + real local Neo4j (`127.0.0.1:7687`, single instance, per-individual knowledge graph). Tanpa mock. LLM via HTTP adapter (live model, settings dari halaman Settings).

> Catatan: benchmark menggunakan 5 iterasi per query. Cold-cache first hit mendominasi nilai max (JIT + page cache warm-up); warm average 6–12 ms untuk query kecil.

## Ringkasan Hasil

| # | Kategori | Test ID | Skenario / Fixture | Expected | Observed | Hasil |
|---|---|---|---|---|---|---|
| 1 | Verifikasi Kutipan Persis | `CITE-POS-1` | Evidence valid dengan quote substring 30 char dari `answer-001` | `quote ∈ Answer.text`, 1 link SOURCE_FOR | `CITATION_MATCH=1`, violations = 0 | ✅ PASS |
| 2 | Verifikasi Kutipan Persis | `CITE-NEG-1` | Inject quote fabrikasi `"FABRICATED TEXT NOT IN SOURCE"` ke Evidence | Deteksi mismatch = 1 | `INJECTED_MISMATCH_DETECTED=1` | ✅ PASS |
| 3 | Verifikasi Kutipan Persis | `CITE-VER-1` | Semua Evidence punya `answer_version` pinned | `pinned == total` | `EVIDENCE_TOTAL=1, VERSION_PINNED=1` (setelah cleanup; 0 violation di semua run) | ✅ PASS |
| 4 | Verifikasi Kutipan Persis | `CITE-EDGE-1` | Health check `Evidence without exactly one SOURCE_FOR` | 0 violation | `0` (semua run) | ✅ PASS |
| 5 | Safety & Failure Gate | `GATE-INSUF-1` | 9 jawaban, model menilai 7 `insufficient` | Insufficient → zero current Evidence ditulis, LLM step di-skip | `SAFETY_GATE_VIOLATIONS=0` | ✅ PASS |
| 6 | Safety & Failure Gate | `GATE-FAIL-1` | Jawaban valid tapi LLM output tidak valid / quote tidak exact-match | Tidak jadi Evidence; dicatat `ModelFailure`, `ok:false` | `MODEL_FAILURES=0` pada run sehat; unit check `invalid quote → stage:"llm"` ✅ | ✅ PASS |
| 7 | Safety & Failure Gate | `GATE-INSUF-2` | Return `runEvidence` untuk insufficient | `ok:true, insufficient:true`, bukan throw/error | Live run: `insufficient:7, failures:0` — tidak ada false failure | ✅ PASS |
| 8 | Safety & Failure Gate | `GATE-JEV-1` | Invalid JSON dari model (malformed/schema) | Reject, tidak persist sebagai bukti valid | Unit check `stage:"jev"` / `stage:"llm"` ✅ | ✅ PASS |
| 9 | Atomic Finalization & Audit Trail | `FIN-ONCE-1` | Finalize pertama oleh manager | `200` | `200` | ✅ PASS |
| 10 | Atomic Finalization & Audit Trail | `FIN-ONCE-2` | Finalize kedua (tamper `rating:5`) | `409` + rating tidak berubah | `409`; trace masih `rating:4, anchor-problem-solving-4` | ✅ PASS |
| 11 | Atomic Finalization & Audit Trail | `FIN-APPEND-1` | Keputusan tersimpan append-only `ManagerDecision` | Exactly 1 node `status:'final'` | `FINAL_DECISION_COUNT=1`; trail: `{action:finalize, status:final, rationale:"verify final"}` | ✅ PASS |
| 12 | Atomic Finalization & Audit Trail | `FIN-RATING-1` | `Rating` final terhubung `RATED_AGAINST` anchor | Level + anchor terbaca dari entity | `{level:4, anchor:anchor-problem-solving-4}` | ✅ PASS |
| 13 | Atomic Finalization & Audit Trail | `FIN-EMP-1` | Employee mencoba finalize | `400/403` (FORBIDDEN) | `400` | ✅ PASS |
| 14 | Benchmark Traversal Graf | `BENCH-GRAPH-1` | Entity graph radius-2 (Employee center) | Eksekusi < 500 ms | min **31.5 ms** / avg **85.3 ms** / max 251.6 ms (cold cache) | ✅ PASS |
| 15 | Benchmark Traversal Graf | `BENCH-TRACE-1` | Evidence trace (decision→rating→anchor→evidence) | Eksekusi < 200 ms | min **7.0 ms** / avg **11.4 ms** / max 17.6 ms | ✅ PASS |
| 16 | Benchmark Traversal Graf | `BENCH-CITE-1` | Citation integrity scan (full substring check) | Eksekusi < 100 ms | min **5.3 ms** / avg **7.4 ms** / max 11.7 ms | ✅ PASS |
| 17 | Benchmark Traversal Graf | `BENCH-JEV-1` | Jev proposal + evidence traversal (4-hop) | Eksekusi < 100 ms | min **4.3 ms** / avg **5.9 ms** / max 7.2 ms | ✅ PASS |

**Total: 17/17 PASS.**

## Metodologi

- Setiap test dijalankan terhadap graph hidup (reset → seed → import fixtures → jalankan skenario), bukan data statis.
- Kutipan diverifikasi sebagai substring persis dari teks jawaban: `MATCH (e:Evidence)<-[:SOURCE_FOR]-(a:Answer) WHERE NOT a.text CONTAINS e.quote`.
- Safety gate diverifikasi dengan membandingkan jumlah jawaban yang diputuskan `insufficient` oleh model dengan jumlah `Evidence {current:true}` yang tertulis di graph untuk jawaban tersebut.
- Audit trail diverifikasi langsung di graph: hitung `ManagerDecision {status:'final'}` (harus tepat 1) dan baca `Rating` final melalui edge `REVISES|FINALIZES` → `RATED_AGAINST`.
- Benchmark: eksekusi langsung query Cypher produksi (entity graph, trace, citation scan, Jev traversal) 5 kali berturut-turut; dicatat min/avg/max.

## Catatan Penting

- `CITE-NEG-1` dan `CITE-POS-1` menggunakan evidence sintetis yang di-inject lalu **dihapus (cleanup) setelah verifikasi** — tidak meninggalkan artifact di graph.
- Live model pada saat pengujian menilai 7 dari 9 jawaban `insufficient` — output valid sesuai desain (T4): insufficiency bukan kegagalan, dan tidak menghasilkan bukti palsu. Ini justru membuktikan safety gate bekerja.
- Tidak ada klaim akurasi/fairness/validitas/TKT — pengujian ini murni verifikasi integritas mekanisme (citation, gate, finalization, latensi), bukan kualitas penilaian.

## Bug yang Ditemukan & Diperbaiki Selama Pengujian

Commit `a137748`, `a7d826e`:

- `appraisalAnswers()` dan `listCurrentEvidence()` di `lib/evidence-store.ts` masih query melalui edge `ABOUT`, padahal migrasi T8 sudah memindahkan link ke `HAS_FEEDBACK`. Akibatnya 8 jawaban peer tidak terproses dan Jev proposal menilai package kosong.
- Perbaikan: kedua query dialihkan ke `Appraisal-[:HAS_FEEDBACK]->Feedback-[:HAS_ANSWER]->Answer`. Setelah fix, AI run memproses 9 jawaban (`ran:9, failures:0`).
- Ditambah juga migrasi idempoten di `graph/seed.ts` untuk menghubungkan feedback live (non-seeded) ke `HAS_FEEDBACK`, sehingga health check kembali 6/6 OK.

## Commit Terkait

```
a7d826e T8 fix: seed links live reviewer feedback via HAS_FEEDBACK
a137748 T8 fix: appraisalAnswers/listCurrentEvidence use HAS_FEEDBACK edge (post-migration shape)
```
