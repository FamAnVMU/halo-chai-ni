import { db } from '../db.js';
import { knowledgeRegistryService, KnowledgeItemType } from '../knowledgeRegistryService.js';
import { CONTRASTIVE_KNOWLEDGE_BASE } from '../aiTutorEngine.js';

export interface MigrationSummary {
  dictMigrated: number;
  vocabMigrated: number;
  vocabDeduplicated: number;
  grammarMigrated: number;
  pronunciationMigrated: number;
  relationsEstablished: number;
  srsUpdated: number;
  errorsUpdated: number;
  ledgerUpdated: number;
  totalKnowledgeItems: number;
  totalSenses: number;
  totalRelations: number;
}

export function runMigrationToKnowledgeRegistry(): MigrationSummary {
  console.log('🔄 Bắt đầu Migration sang Knowledge Registry (v2.0.0 Nền tảng dữ liệu)...');

  const now = Date.now();
  let dictMigrated = 0;
  let vocabMigrated = 0;
  let vocabDeduplicated = 0;
  let grammarMigrated = 0;
  let pronunciationMigrated = 0;
  let relationsEstablished = 0;
  let srsUpdated = 0;
  let errorsUpdated = 0;
  let ledgerUpdated = 0;

  const insertLegacyMapping = db.prepare(`
    INSERT OR REPLACE INTO knowledge_legacy_mapping (
      legacy_table, legacy_id, knowledge_id, legacy_key, migrated_at
    ) VALUES (?, ?, ?, ?, ?)
  `);

  const migrationTx = db.transaction(() => {
    // ========================================================================
    // BƯỚC 1: MIGRATION TỪ ĐIỂN (dictionary_entries)
    // ========================================================================
    const dictRows = db.prepare('SELECT * FROM dictionary_entries').all() as any[];
    for (const d of dictRows) {
      let sensesInput: any[] = [];
      if (d.senses_json) {
        try {
          const parsed = JSON.parse(d.senses_json);
          if (Array.isArray(parsed) && parsed.length > 0) {
            sensesInput = parsed;
          }
        } catch {
          // fallback
        }
      }

      let examplesParsed: any[] = [];
      if (d.examples_json) {
        try {
          const ep = JSON.parse(d.examples_json);
          if (Array.isArray(ep)) examplesParsed = ep;
        } catch {
          // fallback
        }
      }

      const initialSense = sensesInput.length > 0 ? {
        wordType: d.word_type || 'từ vựng',
        meaningVi: sensesInput[0].meaningVi || d.meaning_vi,
        contextDescription: sensesInput[0].contextVi,
        examples: examplesParsed.length > 0 ? examplesParsed : (sensesInput[0].example ? [sensesInput[0].example] : [])
      } : {
        wordType: d.word_type || 'từ vựng',
        meaningVi: d.meaning_vi,
        measureWords: d.measure_words || undefined,
        examples: examplesParsed
      };

      const res = knowledgeRegistryService.findOrCreateKnowledge({
        itemType: 'vocabulary',
        displayText: d.simplified,
        hanziSimplified: d.simplified,
        hanziTraditional: d.traditional || undefined,
        pinyin: d.pinyin,
        pinyinClean: d.pinyin_clean,
        hskLevel: d.hsk_level || 1,
        category: d.word_type || 'từ vựng',
        metadata: {
          radical: d.radical,
          strokeCount: d.stroke_count,
          characterDecomposition: d.character_decomposition,
          measureWords: d.measure_words
        },
        source: d.source || 'dictionary',
        initialSense,
        aliases: d.traditional && d.traditional !== d.simplified ? [d.traditional] : []
      });

      // Nếu có thêm sense thứ 2, 3... trong senses_json, thêm vào
      if (sensesInput.length > 1) {
        for (let i = 1; i < sensesInput.length; i++) {
          const s = sensesInput[i];
          knowledgeRegistryService.addSense(res.item.id, {
            wordType: d.word_type || 'từ vựng',
            meaningVi: s.meaningVi,
            contextDescription: s.contextVi,
            examples: s.example ? [s.example] : []
          });
        }
      }

      // Cập nhật lại knowledge_id vào dictionary_entries
      db.prepare('UPDATE dictionary_entries SET knowledge_id = ? WHERE id = ?').run(res.item.id, d.id);

      // Lưu ánh xạ legacy
      insertLegacyMapping.run('dictionary_entries', d.id, res.item.id, d.simplified, now);
      dictMigrated++;
    }

    // ========================================================================
    // BƯỚC 2: MIGRATION BỘ NHỚ TỪ VỰNG (vocabulary_memory)
    // Tự động đối chiếu và tái sử dụng Knowledge ID đã tạo ở Bước 1
    // ========================================================================
    const vocabRows = db.prepare('SELECT * FROM vocabulary_memory').all() as any[];
    for (const v of vocabRows) {
      let examplesParsed: any[] = [];
      if (v.examples_json) {
        try {
          const ep = JSON.parse(v.examples_json);
          if (Array.isArray(ep)) {
            examplesParsed = ep.map((ex: any) => typeof ex === 'string' ? { zh: ex, vi: '' } : ex);
          }
        } catch {
          // fallback
        }
      }

      const res = knowledgeRegistryService.findOrCreateKnowledge({
        itemType: 'vocabulary',
        displayText: v.simplified,
        hanziSimplified: v.simplified,
        hanziTraditional: v.traditional || undefined,
        pinyin: v.pinyin,
        hskLevel: v.hsk_level || 1,
        category: v.word_type || 'từ vựng',
        source: 'vocabulary_memory',
        initialSense: {
          wordType: v.word_type || 'từ vựng',
          meaningVi: v.meaning_vi,
          examples: examplesParsed
        }
      });

      if (!res.created) {
        vocabDeduplicated++;
      }

      // Cập nhật knowledge_id vào vocabulary_memory
      db.prepare('UPDATE vocabulary_memory SET knowledge_id = ? WHERE id = ?').run(res.item.id, v.id);

      // Lưu ánh xạ legacy
      insertLegacyMapping.run('vocabulary_memory', String(v.id), res.item.id, v.simplified, now);
      vocabMigrated++;
    }

    // ========================================================================
    // BƯỚC 3: MIGRATION BỘ NHỚ NGỮ PHÁP & MẪU CÂU (grammar_memory)
    // ========================================================================
    const grammarRows = db.prepare('SELECT * FROM grammar_memory').all() as any[];
    for (const g of grammarRows) {
      let examplesParsed: any[] = [];
      if (g.examples_json) {
        try {
          const ep = JSON.parse(g.examples_json);
          if (Array.isArray(ep)) {
            examplesParsed = ep.map((ex: any) => typeof ex === 'string' ? { zh: ex, vi: '' } : ex);
          }
        } catch {
          // fallback
        }
      }

      let commonMistakesParsed: string[] = [];
      if (g.common_mistakes_json) {
        try {
          const cm = JSON.parse(g.common_mistakes_json);
          if (Array.isArray(cm)) commonMistakesParsed = cm;
        } catch {
          // fallback
        }
      }

      // Phân biệt mẫu câu (sentence_pattern) vs quy tắc ngữ pháp (grammar)
      const isPattern = g.pattern_name.includes('……') || g.pattern_name.includes('Mẫu câu') || g.pattern_name.includes('一边');
      const itemType: KnowledgeItemType = isPattern ? 'sentence_pattern' : 'grammar';

      const res = knowledgeRegistryService.findOrCreateKnowledge({
        itemType,
        displayText: g.pattern_name,
        formula: g.formula,
        usageConditions: g.usage_notes || undefined,
        hskLevel: g.hsk_level || 1,
        commonMistakes: commonMistakesParsed,
        source: 'grammar_memory',
        initialSense: {
          wordType: isPattern ? 'mẫu câu' : 'ngữ pháp',
          meaningVi: g.meaning_vi,
          contextDescription: g.usage_notes || undefined,
          examples: examplesParsed
        }
      });

      // Cập nhật knowledge_id vào grammar_memory
      db.prepare('UPDATE grammar_memory SET knowledge_id = ? WHERE id = ?').run(res.item.id, g.id);

      // Lưu ánh xạ legacy
      insertLegacyMapping.run('grammar_memory', String(g.id), res.item.id, g.pattern_name, now);
      grammarMigrated++;
    }

    // ========================================================================
    // BƯỚC 4: THIẾT LẬP MẠNG LƯỚI QUAN HỆ ĐỐI CHIẾU (CONTRASTIVE RELATIONS)
    // ========================================================================
    for (const key of Object.keys(CONTRASTIVE_KNOWLEDGE_BASE)) {
      const pair = CONTRASTIVE_KNOWLEDGE_BASE[key];
      // Tìm 2 từ trong knowledge_items
      const itemA = db.prepare(`
        SELECT id FROM knowledge_items WHERE (hanzi_simplified = ? OR display_text = ?) AND status != 'archived' LIMIT 1
      `).get(pair.wordA, pair.wordA) as any;

      const itemB = db.prepare(`
        SELECT id FROM knowledge_items WHERE (hanzi_simplified = ? OR display_text = ?) AND status != 'archived' LIMIT 1
      `).get(pair.wordB, pair.wordB) as any;

      if (itemA && itemB && itemA.id !== itemB.id) {
        knowledgeRegistryService.addRelation(
          itemA.id,
          itemB.id,
          'confused_with',
          pair.distinctionSummaryVi,
          {
            pitfallsVi: pair.commonPitfallsVi,
            contrastExamples: pair.contrastExamples
          },
          true // hai chiều
        );
        relationsEstablished++;
      }
    }

    // ========================================================================
    // BƯỚC 5: MIGRATION KHÁI NIỆM PHÁT ÂM (pronunciation_weaknesses)
    // ========================================================================
    const weakRows = db.prepare('SELECT * FROM pronunciation_weaknesses').all() as any[];
    for (const w of weakRows) {
      const soundKey = w.sound_key.trim();
      const soundCategory = w.sound_category || 'general';

      const res = knowledgeRegistryService.findOrCreateKnowledge({
        itemType: 'pronunciation',
        displayText: soundKey,
        category: soundCategory,
        hskLevel: 1,
        source: 'pronunciation_weaknesses',
        initialSense: {
          wordType: 'ngữ âm',
          meaningVi: w.title || `Khái niệm phát âm: ${soundKey}`
        }
      });

      db.prepare('UPDATE pronunciation_weaknesses SET knowledge_id = ? WHERE id = ?').run(res.item.id, w.id);
      insertLegacyMapping.run('pronunciation_weaknesses', String(w.id), res.item.id, soundKey, now);
      pronunciationMigrated++;
    }

    // Thiết lập quan hệ nhầm lẫn giữa zh và z
    const zhItem = db.prepare("SELECT id FROM knowledge_items WHERE item_type = 'pronunciation' AND display_text = 'zh' LIMIT 1").get() as any;
    const zItem = db.prepare("SELECT id FROM knowledge_items WHERE item_type = 'pronunciation' AND display_text = 'z' LIMIT 1").get() as any;
    if (zhItem && zItem) {
      knowledgeRegistryService.addRelation(
        zhItem.id,
        zItem.id,
        'confused_with',
        'Cặp âm dễ nhầm: zh (âm cuộn lưỡi, không bật hơi) vs z (âm đầu lưỡi trước, không bật hơi)',
        undefined,
        true
      );
      relationsEstablished++;
    }

    // ========================================================================
    // BƯỚC 6: CẬP NHẬT KNOWLEDGE_ID CHO SRS ITEMS
    // ========================================================================
    const srsRows = db.prepare('SELECT id, item_type, reference_id, prompt_zh FROM srs_items').all() as any[];
    for (const item of srsRows) {
      let targetKid: string | null = null;

      if (item.item_type === 'vocabulary') {
        const mapping = db.prepare(`
          SELECT knowledge_id FROM knowledge_legacy_mapping
          WHERE legacy_table = 'vocabulary_memory' AND legacy_id = ?
        `).get(item.reference_id) as any;
        targetKid = mapping?.knowledge_id;
      } else if (item.item_type === 'grammar') {
        const mapping = db.prepare(`
          SELECT knowledge_id FROM knowledge_legacy_mapping
          WHERE legacy_table = 'grammar_memory' AND legacy_id = ?
        `).get(item.reference_id) as any;
        targetKid = mapping?.knowledge_id;
      }

      if (!targetKid && item.prompt_zh) {
        const found = db.prepare(`
          SELECT id FROM knowledge_items WHERE hanzi_simplified = ? OR display_text = ? LIMIT 1
        `).get(item.prompt_zh, item.prompt_zh) as any;
        targetKid = found?.id;
      }

      if (targetKid) {
        db.prepare('UPDATE srs_items SET knowledge_id = ? WHERE id = ?').run(targetKid, item.id);
        srsUpdated++;
      }
    }

    // ========================================================================
    // BƯỚC 7: CẬP NHẬT LEARNING ERRORS & EVIDENCE LEDGER
    // ========================================================================
    const errorRows = db.prepare('SELECT id, title, user_sentence FROM learning_errors').all() as any[];
    for (const e of errorRows) {
      // Tìm từ khóa trong knowledge_items
      const matched = db.prepare(`
        SELECT id FROM knowledge_items
        WHERE ? LIKE '%' || hanzi_simplified || '%' AND hanzi_simplified IS NOT NULL AND length(hanzi_simplified) >= 1
        ORDER BY length(hanzi_simplified) DESC LIMIT 1
      `).get(e.title || e.user_sentence) as any;

      if (matched) {
        db.prepare('UPDATE learning_errors SET knowledge_id = ? WHERE id = ?').run(matched.id, e.id);
        errorsUpdated++;
      }
    }

    const ledgerRows = db.prepare('SELECT id, target_type, target_key FROM learner_evidence_ledger').all() as any[];
    for (const l of ledgerRows) {
      const cleanKey = l.target_key.replace(/^(word_|grammar_)/, '');
      const matched = db.prepare(`
        SELECT id FROM knowledge_items
        WHERE hanzi_simplified = ? OR display_text = ? OR canonical_key LIKE ?
        LIMIT 1
      `).get(cleanKey, cleanKey, `%${cleanKey}%`) as any;

      if (matched) {
        db.prepare('UPDATE learner_evidence_ledger SET knowledge_id = ? WHERE id = ?').run(matched.id, l.id);
        ledgerUpdated++;
      }
    }
  });

  migrationTx();

  const stats = knowledgeRegistryService.getRegistryStats();
  console.log(`✅ Migration hoàn tất thành công!`);
  console.log(`   - Tổng Knowledge Items: ${stats.totalItems}`);
  console.log(`   - Tổng Senses: ${stats.totalSenses}`);
  console.log(`   - Tổng Relations: ${stats.totalRelations}`);
  console.log(`   - Từ vựng đối chiếu trùng lặp & dùng chung: ${vocabDeduplicated}`);
  console.log(`   - SRS items gắn Knowledge ID: ${srsUpdated}`);

  return {
    dictMigrated,
    vocabMigrated,
    vocabDeduplicated,
    grammarMigrated,
    pronunciationMigrated,
    relationsEstablished,
    srsUpdated,
    errorsUpdated,
    ledgerUpdated,
    totalKnowledgeItems: stats.totalItems,
    totalSenses: stats.totalSenses,
    totalRelations: stats.totalRelations
  };
}
