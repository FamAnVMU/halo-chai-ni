import { GoogleGenAI } from '@google/genai';
import { db } from './db.js';
import { geminiTextService } from './geminiTextService.js';
import { unifiedAIOrchestrator } from './unifiedAIOrchestrator.js';
import { learningEvidenceService } from './learningEvidenceService.js';
import {
  SEED_DICTIONARY_ENTRIES,
  DictionaryEntry,
  normalizePinyin,
  tokenizeChinese
} from '../src/data/seedDictionary.js';

export interface SearchDictionaryParams {
  query: string;
  type?: 'auto' | 'chinese' | 'pinyin' | 'vietnamese';
  hskLevel?: number;
  wordType?: string;
  limit?: number;
}

export interface DictionarySearchResultItem {
  id: string;
  simplified: string;
  traditional?: string;
  pinyin: string;
  meaningVi: string;
  wordType: string;
  hskLevel: number;
  radical?: string;
  strokeCount?: number;
  measureWords?: string;
  isFavorite: boolean;
  masteryStatus: 'not_started' | 'introduced' | 'learning' | 'mastered';
  inSrs: boolean;
  source: string;
}

export interface ContextLookupResult {
  sentence: string;
  targetWord: string;
  pinyin: string;
  contextualMeaningVi: string;
  grammaticalRoleVi: string;
  reasonVi: string;
  sentenceTranslationVi: string;
  otherPossibleMeanings?: string[];
  learnerTipVi: string;
  entryDetail?: DictionaryEntry | null;
}

export interface WordComparisonResult {
  words: string[];
  similaritiesVi: string;
  differencesVi: string;
  comparisonTable: Array<{
    word: string;
    pinyin: string;
    coreMeaningVi: string;
    keyFeatureVi: string;
    exampleZh: string;
    exampleVi: string;
  }>;
  commonMistakesVi: string[];
}

export class GeminiDictionaryService {
  constructor() {
    this.ensureSeedDictionary();
  }

  /**
   * Đảm bảo kho từ điển hạt giống được nạp vào SQLite
   */
  public ensureSeedDictionary(): void {
    try {
      const countRow = db.prepare('SELECT COUNT(*) as count FROM dictionary_entries').get() as any;
      if (countRow?.count === 0) {
        const now = Date.now();
        const insertStmt = db.prepare(`
          INSERT OR IGNORE INTO dictionary_entries (
            id, simplified, traditional, pinyin, pinyin_clean, meaning_vi,
            word_type, hsk_level, radical, stroke_count, character_decomposition,
            measure_words, synonyms_json, antonyms_json, confusing_words_json,
            collocations_json, senses_json, examples_json, source, version,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const entry of SEED_DICTIONARY_ENTRIES) {
          insertStmt.run(
            entry.id,
            entry.simplified,
            entry.traditional || null,
            entry.pinyin,
            entry.pinyinClean || normalizePinyin(entry.pinyin),
            entry.meaningVi,
            entry.wordType,
            entry.hskLevel,
            entry.radical || null,
            entry.strokeCount || 1,
            entry.characterDecomposition || null,
            entry.measureWords || null,
            entry.synonyms ? JSON.stringify(entry.synonyms) : null,
            entry.antonyms ? JSON.stringify(entry.antonyms) : null,
            entry.confusingWords ? JSON.stringify(entry.confusingWords) : null,
            entry.collocations ? JSON.stringify(entry.collocations) : null,
            entry.senses ? JSON.stringify(entry.senses) : null,
            JSON.stringify(entry.examples || []),
            entry.source || 'standard_hsk_cedict',
            entry.version || '1.0',
            now,
            now
          );
        }
        console.log(`[Dictionary] Đã nạp thành công ${SEED_DICTIONARY_ENTRIES.length} mục từ chuẩn HSK vào SQLite.`);
      }
    } catch (err) {
      console.error('[Dictionary] Lỗi khởi tạo seed dictionary:', err);
    }
  }

  /**
   * Tra cứu từ điển đa năng: chữ Hán, Pinyin (có/không dấu), tiếng Việt
   */
  public async search(params: SearchDictionaryParams): Promise<{
    query: string;
    detectedType: string;
    results: DictionarySearchResultItem[];
    totalCount: number;
    isAiFallback?: boolean;
  }> {
    this.ensureSeedDictionary();

    const rawQuery = (params.query || '').trim();
    if (!rawQuery) {
      return { query: '', detectedType: 'auto', results: [], totalCount: 0 };
    }

    const limit = params.limit || 30;

    // 1. Tự động nhận diện loại tìm kiếm
    let detectedType = params.type || 'auto';
    if (detectedType === 'auto') {
      if (/[\u4e00-\u9fa5]/.test(rawQuery)) {
        detectedType = 'chinese';
      } else if (/[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(rawQuery)) {
        detectedType = 'vietnamese';
      } else {
        detectedType = 'pinyin';
      }
    }

    let rows: any[] = [];
    const normalizedClean = normalizePinyin(rawQuery);

    if (detectedType === 'chinese') {
      // Tìm theo chữ Hán: Ưu tiên khớp chính xác -> bắt đầu bằng -> chứa trong từ
      rows = db.prepare(`
        SELECT * FROM dictionary_entries
        WHERE simplified = ? OR traditional = ?
           OR simplified LIKE ? OR traditional LIKE ?
        ORDER BY 
          CASE 
            WHEN simplified = ? THEN 1
            WHEN simplified LIKE ? THEN 2
            ELSE 3
          END,
          hsk_level ASC,
          stroke_count ASC
        LIMIT ?
      `).all(
        rawQuery, rawQuery,
        `${rawQuery}%`, `${rawQuery}%`,
        rawQuery, `${rawQuery}%`,
        limit
      );
    } else if (detectedType === 'pinyin') {
      // Tìm theo Pinyin (hỗ trợ cả có dấu và không dấu tone-agnostic)
      rows = db.prepare(`
        SELECT * FROM dictionary_entries
        WHERE pinyin_clean = ? OR pinyin_clean LIKE ? OR pinyin LIKE ?
        ORDER BY 
          CASE 
            WHEN pinyin_clean = ? THEN 1
            WHEN pinyin_clean LIKE ? THEN 2
            ELSE 3
          END,
          hsk_level ASC
        LIMIT ?
      `).all(
        normalizedClean, `${normalizedClean}%`, `%${rawQuery}%`,
        normalizedClean, `${normalizedClean}%`,
        limit
      );
    } else {
      // Tìm theo nghĩa tiếng Việt
      rows = db.prepare(`
        SELECT * FROM dictionary_entries
        WHERE meaning_vi LIKE ? OR senses_json LIKE ?
        ORDER BY 
          CASE 
            WHEN meaning_vi LIKE ? THEN 1
            ELSE 2
          END,
          hsk_level ASC
        LIMIT ?
      `).all(
        `%${rawQuery}%`, `%${rawQuery}%`,
        `%${rawQuery}%`,
        limit
      );
    }

    // Ghi nhận lịch sử tìm kiếm vào SQLite
    try {
      db.prepare(`
        INSERT INTO dictionary_history (user_id, query, query_type, result_entry_id, created_at)
        VALUES ('default', ?, ?, ?, ?)
      `).run(rawQuery, detectedType, rows[0]?.id || null, Date.now());
    } catch {}

    // 2. Nếu không tìm thấy trong dữ liệu cục bộ và là chữ Hán (1-6 ký tự), gọi AI hỗ trợ giải thích & lưu cache
    let isAiFallback = false;
    if (rows.length === 0 && detectedType === 'chinese' && rawQuery.length <= 8) {
      const aiEntry = await this.generateEntryWithAI(rawQuery);
      if (aiEntry) {
        rows = [aiEntry];
        isAiFallback = true;
      }
    }

    // 3. Ghép nối trạng thái người học (Memory, SRS, Notes)
    const formattedResults: DictionarySearchResultItem[] = rows.map((r: any) => {
      // Kiểm tra bộ nhớ học tập
      const vocabMem = db.prepare('SELECT id, mastery_level FROM vocabulary_memory WHERE simplified = ?').get(r.simplified) as any;
      // Kiểm tra SRS
      const srsItem = db.prepare('SELECT id FROM srs_items WHERE prompt_zh = ? OR reference_id = ?').get(r.simplified, r.id) as any;
      // Kiểm tra Favorite
      const personalNote = db.prepare('SELECT is_favorite FROM dictionary_personal_notes WHERE entry_id = ?').get(r.id) as any;

      let masteryStatus: 'not_started' | 'introduced' | 'learning' | 'mastered' = 'not_started';
      if (vocabMem) {
        masteryStatus = (vocabMem.mastery_level as any) || 'introduced';
      }

      return {
        id: r.id,
        simplified: r.simplified,
        traditional: r.traditional || undefined,
        pinyin: r.pinyin,
        meaningVi: r.meaning_vi,
        wordType: r.word_type,
        hskLevel: r.hsk_level,
        radical: r.radical || undefined,
        strokeCount: r.stroke_count || undefined,
        measureWords: r.measure_words || undefined,
        isFavorite: personalNote?.is_favorite === 1,
        masteryStatus,
        inSrs: !!srsItem,
        source: r.source || 'standard_hsk_cedict'
      };
    });

    return {
      query: rawQuery,
      detectedType,
      results: formattedResults,
      totalCount: formattedResults.length,
      isAiFallback
    };
  }

  /**
   * Lấy toàn bộ thông tin chi tiết của một từ kèm trạng thái người học và ghi chú cá nhân
   */
  public getEntryById(id: string): (DictionaryEntry & {
    personalNote?: string;
    isFavorite: boolean;
    tags?: string[];
    lookupCount: number;
    learnerState: {
      inVocabMemory: boolean;
      masteryLevel?: string;
      reviewCount?: number;
      lastReviewedAt?: number;
      inSrs: boolean;
      srsIntervalDays?: number;
      srsNextReviewAt?: number;
      errorsCount: number;
    };
  }) | null {
    this.ensureSeedDictionary();

    const row = db.prepare('SELECT * FROM dictionary_entries WHERE id = ?').get(id) as any;
    if (!row) return null;

    // Tăng lượt tra cứu và cập nhật thời gian
    const now = Date.now();
    try {
      const existingNote = db.prepare('SELECT id, lookup_count FROM dictionary_personal_notes WHERE entry_id = ?').get(id) as any;
      if (existingNote) {
        db.prepare('UPDATE dictionary_personal_notes SET lookup_count = lookup_count + 1, last_looked_up_at = ? WHERE id = ?')
          .run(now, existingNote.id);
      } else {
        const noteId = `note_${now}_${Math.random().toString(36).substring(2, 6)}`;
        db.prepare(`
          INSERT INTO dictionary_personal_notes (id, user_id, entry_id, is_favorite, personal_note, tags_json, lookup_count, last_looked_up_at, created_at, updated_at)
          VALUES (?, 'default', ?, 0, '', '[]', 1, ?, ?, ?)
        `).run(noteId, id, now, now, now);
      }

      // Ghi nhận Exposure Evidence (Phase A2)
      const kid = row.knowledge_id || null;
      learningEvidenceService.recordEvidence({
        knowledgeId: kid || undefined,
        rawText: !kid ? row.simplified : undefined,
        evidenceType: 'exposure',
        action: 'dictionary_lookup',
        sourceModule: 'dictionary',
        observedData: {
          speaker: 'user',
          userText: row.simplified,
          contextSentence: row.meaning_vi
        },
        assessmentData: {
          isCorrect: null,
          timeSpentMs: 0
        },
        assessmentMethod: 'deterministic_rule',
        evaluator: 'dictionary_service',
        confidence: 1.0
      });
    } catch {}

    const personal = db.prepare('SELECT * FROM dictionary_personal_notes WHERE entry_id = ?').get(id) as any;
    const vocabMem = db.prepare('SELECT * FROM vocabulary_memory WHERE simplified = ?').get(row.simplified) as any;
    const srsItem = db.prepare('SELECT * FROM srs_items WHERE prompt_zh = ? OR reference_id = ?').get(row.simplified, row.id) as any;
    const errors = db.prepare('SELECT COUNT(*) as count FROM learning_errors WHERE user_sentence LIKE ?').get(`%${row.simplified}%`) as any;

    return {
      id: row.id,
      simplified: row.simplified,
      traditional: row.traditional || undefined,
      pinyin: row.pinyin,
      pinyinClean: row.pinyin_clean,
      meaningVi: row.meaning_vi,
      wordType: row.word_type,
      hskLevel: row.hsk_level,
      radical: row.radical || undefined,
      strokeCount: row.stroke_count || 1,
      characterDecomposition: row.character_decomposition || undefined,
      measureWords: row.measure_words || undefined,
      synonyms: row.synonyms_json ? JSON.parse(row.synonyms_json) : undefined,
      antonyms: row.antonyms_json ? JSON.parse(row.antonyms_json) : undefined,
      confusingWords: row.confusing_words_json ? JSON.parse(row.confusing_words_json) : undefined,
      collocations: row.collocations_json ? JSON.parse(row.collocations_json) : undefined,
      senses: row.senses_json ? JSON.parse(row.senses_json) : undefined,
      examples: row.examples_json ? JSON.parse(row.examples_json) : [],
      source: row.source,
      version: row.version,
      personalNote: personal?.personal_note || '',
      isFavorite: personal?.is_favorite === 1,
      tags: personal?.tags_json ? JSON.parse(personal.tags_json) : [],
      lookupCount: personal?.lookup_count || 1,
      learnerState: {
        inVocabMemory: !!vocabMem,
        masteryLevel: vocabMem?.mastery_level || 'not_started',
        reviewCount: vocabMem?.review_count || 0,
        lastReviewedAt: vocabMem?.last_reviewed_at || undefined,
        inSrs: !!srsItem,
        srsIntervalDays: srsItem?.interval_days || undefined,
        srsNextReviewAt: srsItem?.next_review_at || undefined,
        errorsCount: errors?.count || 0
      }
    };
  }

  /**
   * Lấy thông tin từ theo chữ Hán giản thể
   */
  public getEntryByWord(word: string): any {
    const row = db.prepare('SELECT id FROM dictionary_entries WHERE simplified = ? OR traditional = ?').get(word, word) as any;
    if (row) {
      return this.getEntryById(row.id);
    }
    return null;
  }

  /**
   * Tra cứu từ trong ngữ cảnh cụ thể (In-context Lookup)
   * Phân tích câu, xác định nghĩa chính xác theo ngữ cảnh, vai trò ngữ pháp và lý do
   */
  public async lookupInContext(params: {
    sentence: string;
    targetWord?: string;
  }): Promise<ContextLookupResult> {
    const sentence = (params.sentence || '').trim();
    if (!sentence) {
      throw new Error('Vui lòng cung cấp câu tiếng Trung để tra cứu ngữ cảnh.');
    }

    // Nếu không chỉ định từ mục tiêu, phân đoạn câu và chọn từ đầu tiên có trong từ điển
    let target = params.targetWord?.trim();
    if (!target) {
      const tokens = tokenizeChinese(sentence);
      const dictTok = tokens.find(t => t.inDictionary && t.token.length >= 2) || tokens.find(t => t.inDictionary);
      target = dictTok ? dictTok.token : sentence.substring(0, 2);
    }

    // Lấy thông tin từ điển cơ bản nếu có
    const localEntry = this.getEntryByWord(target);

    // Ghi nhận vào lịch sử
    try {
      db.prepare(`
        INSERT INTO dictionary_history (user_id, query, query_type, result_entry_id, context_sentence, created_at)
        VALUES ('default', ?, 'context', ?, ?, ?)
      `).run(target, localEntry?.id || null, sentence, Date.now());
    } catch {}

    const apiKey = geminiTextService.getApiKey();
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `Bạn là chuyên gia ngôn ngữ học và từ điển tiếng Trung cao cấp.
Hãy phân tích chính xác nghĩa và vai trò của từ "${target}" trong câu cụ thể sau đây:
Câu tiếng Trung: "${sentence}"

Yêu cầu trả về định dạng JSON thuần túy (không bọc trong markdown code fence) có cấu trúc:
{
  "pinyin": "phiên âm Pinyin có dấu thanh của từ mục tiêu trong câu này",
  "contextualMeaningVi": "nghĩa tiếng Việt chính xác và tinh tế nhất của từ này trong câu trên",
  "grammaticalRoleVi": "vai trò ngữ pháp trong câu (ví dụ: Chủ ngữ, Vị ngữ chính, Bổ ngữ trạng thái, Định ngữ...)",
  "reasonVi": "giải thích ngắn gọn và dễ hiểu tại sao trong câu này từ lại mang nghĩa đó mà không phải các nghĩa khác",
  "sentenceTranslationVi": "bản dịch tiếng Việt tự nhiên và chuẩn xác của toàn bộ câu",
  "otherPossibleMeanings": ["nghĩa thông thường khác 1", "nghĩa thông thường khác 2"],
  "learnerTipVi": "lời khuyên sư phạm cho người Việt khi dùng từ này trong cấu trúc tương tự"
}`;

        const startDictCall = Date.now();
        const targetModel = geminiTextService.getModel();
        const cleanJson = await unifiedAIOrchestrator.invokeWithTimeoutAndRetry(
          targetModel,
          'Bạn là chuyên gia ngôn ngữ học tiếng Trung. Chỉ trả về JSON thuần túy.',
          prompt,
          'json',
          0.2,
          20000,
          1
        );
        unifiedAIOrchestrator.logAudit({
          requestId: `req_dict_context_${Date.now()}`,
          taskId: 'EXPLAIN_VOCABULARY',
          modelCategory: 'text_out',
          modelId: targetModel,
          promptVersion: 'v2.8.0',
          status: 'completed',
          latencyMs: Date.now() - startDictCall
        });

        if (cleanJson) {
          const parsed = JSON.parse(cleanJson);
          return {
            sentence,
            targetWord: target,
            pinyin: parsed.pinyin || localEntry?.pinyin || '',
            contextualMeaningVi: parsed.contextualMeaningVi || localEntry?.meaningVi || '',
            grammaticalRoleVi: parsed.grammaticalRoleVi || 'Thành phần câu',
            reasonVi: parsed.reasonVi || 'Xác định dựa trên vị trí kết hợp từ trong ngữ cảnh.',
            sentenceTranslationVi: parsed.sentenceTranslationVi || '',
            otherPossibleMeanings: parsed.otherPossibleMeanings || [],
            learnerTipVi: parsed.learnerTipVi || 'Chú ý cấu trúc đi kèm của từ trong câu.',
            entryDetail: localEntry
          };
        }
      } catch (err) {
        console.warn('[Dictionary] AI Context lookup notice:', err);
      }
    }

    // Fallback nếu không có internet hoặc API key
    return {
      sentence,
      targetWord: target,
      pinyin: localEntry?.pinyin || '',
      contextualMeaningVi: localEntry?.meaningVi || 'Ý nghĩa theo từ điển chuẩn',
      grammaticalRoleVi: localEntry?.wordType || 'Động từ / Danh từ',
      reasonVi: 'Xác định theo ngữ cảnh từ điển hạt giống chuẩn HSK.',
      sentenceTranslationVi: localEntry?.examples?.[0]?.vi || 'Đang cập nhật bản dịch câu.',
      otherPossibleMeanings: localEntry?.synonyms || [],
      learnerTipVi: 'Tham khảo ví dụ thực tế trong mục chi tiết của từ điển.',
      entryDetail: localEntry
    };
  }

  /**
   * Phân biệt các từ gần nghĩa dễ nhầm lẫn (Confusing Words Comparison)
   */
  public async compareWords(words: string[]): Promise<WordComparisonResult> {
    if (!words || words.length < 2) {
      throw new Error('Cần cung cấp ít nhất 2 từ để so sánh phân biệt.');
    }

    const cleanWords = words.map(w => w.trim()).filter(Boolean);

    // Kiểm tra xem trong từ điển hạt giống đã có phân biệt sẵn chưa
    const firstWordEntry = this.getEntryByWord(cleanWords[0]);
    if (firstWordEntry?.confusingWords && firstWordEntry.confusingWords.length > 0) {
      const matchConfusing = firstWordEntry.confusingWords.find((c: any) => cleanWords.includes(c.word));
      if (matchConfusing) {
        const secondWordEntry = this.getEntryByWord(matchConfusing.word);
        return {
          words: cleanWords,
          similaritiesVi: `Cả hai từ [${firstWordEntry.simplified}] và [${matchConfusing.word}] đều liên quan đến cùng một nhóm ngữ nghĩa và có thể xuất hiện trong các ngữ cảnh giao tiếp thông thường.`,
          differencesVi: matchConfusing.differenceVi,
          comparisonTable: [
            {
              word: firstWordEntry.simplified,
              pinyin: firstWordEntry.pinyin,
              coreMeaningVi: firstWordEntry.meaningVi,
              keyFeatureVi: 'Từ dùng phổ biến, nét nghĩa rộng.',
              exampleZh: firstWordEntry.examples?.[0]?.zh || '',
              exampleVi: firstWordEntry.examples?.[0]?.vi || ''
            },
            {
              word: matchConfusing.word,
              pinyin: matchConfusing.pinyin,
              coreMeaningVi: secondWordEntry?.meaningVi || matchConfusing.differenceVi,
              keyFeatureVi: matchConfusing.differenceVi,
              exampleZh: matchConfusing.exampleZh || secondWordEntry?.examples?.[0]?.zh || '',
              exampleVi: matchConfusing.exampleVi || secondWordEntry?.examples?.[0]?.vi || ''
            }
          ],
          commonMistakesVi: [
            `Người Việt thường dùng nhầm [${firstWordEntry.simplified}] và [${matchConfusing.word}] do dịch cùng một từ tương đương trong tiếng Việt mà không để ý tới sắc thái ngữ cảnh.`
          ]
        };
      }
    }

    // Nếu chưa có bảng so sánh sẵn, gọi AI Gemini sinh phân tích sư phạm chất lượng cao
    const apiKey = geminiTextService.getApiKey();
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `Bạn là chuyên gia giảng dạy Hán ngữ đối chiếu cho người Việt Nam.
Hãy phân biệt rõ ràng và chi tiết các từ gần nghĩa sau: ${cleanWords.join(', ')}.

Yêu cầu trả về định dạng JSON thuần túy (không bọc trong markdown code fence) có cấu trúc:
{
  "similaritiesVi": "Điểm giống nhau cốt lõi giữa các từ",
  "differencesVi": "Điểm khác biệt quan trọng nhất về phạm vi ý nghĩa, sắc thái biểu cảm và kết cấu ngữ pháp",
  "comparisonTable": [
    {
      "word": "từ",
      "pinyin": "pinyin có dấu",
      "coreMeaningVi": "nghĩa cốt lõi ngắn gọn",
      "keyFeatureVi": "đặc điểm nổi bật nhất khi sử dụng",
      "exampleZh": "câu ví dụ điển hình bằng chữ Hán",
      "exampleVi": "dịch nghĩa tiếng Việt của câu ví dụ"
    }
  ],
  "commonMistakesVi": [
    "lỗi sai 1 người Việt hay mắc kèm câu sai và sửa lại",
    "lỗi sai 2 người Việt hay mắc"
  ]
}`;

        const startDictCall = Date.now();
        const targetModel = geminiTextService.getModel();
        const cleanJson = await unifiedAIOrchestrator.invokeWithTimeoutAndRetry(
          targetModel,
          'Bạn là chuyên gia ngôn ngữ học tiếng Trung. Chỉ trả về JSON thuần túy.',
          prompt,
          'json',
          0.2,
          20000,
          1
        );
        unifiedAIOrchestrator.logAudit({
          requestId: `req_dict_context_${Date.now()}`,
          taskId: 'EXPLAIN_VOCABULARY',
          modelCategory: 'text_out',
          modelId: targetModel,
          promptVersion: 'v2.8.0',
          status: 'completed',
          latencyMs: Date.now() - startDictCall
        });

        if (cleanJson) {
          const parsed = JSON.parse(cleanJson);
          return {
            words: cleanWords,
            similaritiesVi: parsed.similaritiesVi || 'Các từ có nét nghĩa gần nhau.',
            differencesVi: parsed.differencesVi || 'Khác biệt về phạm vi ngữ nghĩa và mức độ trang trọng.',
            comparisonTable: parsed.comparisonTable || [],
            commonMistakesVi: parsed.commonMistakesVi || []
          };
        }
      } catch (err) {
        console.warn('[Dictionary] AI compare words notice:', err);
      }
    }

    // Fallback so sánh đơn giản
    return {
      words: cleanWords,
      similaritiesVi: `Các từ [${cleanWords.join(', ')}] đều thuộc từ vựng tiếng Trung trung cấp cần lưu ý cách dùng.`,
      differencesVi: 'Mỗi từ có điều kiện kết hợp và đối tượng bổ nghĩa khác nhau.',
      comparisonTable: cleanWords.map(w => {
        const e = this.getEntryByWord(w);
        return {
          word: w,
          pinyin: e?.pinyin || '',
          coreMeaningVi: e?.meaningVi || 'Đang cập nhật',
          keyFeatureVi: e?.wordType || 'Ngữ nghĩa chuyên biệt',
          exampleZh: e?.examples?.[0]?.zh || '',
          exampleVi: e?.examples?.[0]?.vi || ''
        };
      }),
      commonMistakesVi: ['Hãy chú ý các từ đi kèm thường dùng (collocations) để tránh dịch máy móc từng chữ.']
    };
  }

  /**
   * Hỏi AI về từ này (AI Vocabulary Consultation)
   */
  public async askAIAboutWord(params: {
    word: string;
    promptType: 'simple_explain' | 'more_examples' | 'distinguish' | 'sentence_quiz' | 'common_errors';
    userLevel?: number;
  }): Promise<{
    word: string;
    promptType: string;
    title: string;
    contentVi: string;
    quizData?: {
      questionZh: string;
      questionPinyin: string;
      options: string[];
      answer: string;
      explanationVi: string;
    };
  }> {
    const word = params.word.trim();
    const localEntry = this.getEntryByWord(word);
    const userHsk = params.userLevel || 2;

    const apiKey = geminiTextService.getApiKey();
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        let instruction = '';

        if (params.promptType === 'simple_explain') {
          instruction = `Hãy giải thích từ "${word}" một cách cực kỳ dễ hiểu, thân thiện dành cho người mới học HSK ${userHsk}. Chỉ ra gốc từ, hình tượng chữ nếu có và mẹo nhớ lâu.`;
        } else if (params.promptType === 'more_examples') {
          instruction = `Hãy tạo 3 câu ví dụ sinh động, gần gũi với đời sống giao tiếp thực tế hàng ngày có chứa từ "${word}". Mỗi câu gồm chữ Hán, Pinyin có dấu thanh và dịch nghĩa tiếng Việt chuẩn xác.`;
        } else if (params.promptType === 'distinguish') {
          instruction = `Hãy tìm một từ gần nghĩa dễ nhầm với "${word}" và giải thích sự khác biệt giữa chúng trong 2-3 câu ngắn gọn kèm ví dụ đối chiếu.`;
        } else if (params.promptType === 'common_errors') {
          instruction = `Hãy liệt kê 2 lỗi sai kinh điển mà người Việt Nam hay mắc phải khi sử dụng từ "${word}" (sai về ngữ pháp, sai vị trí từ, hoặc dùng sai ngữ cảnh). Cho câu sai mẫu và sửa lại câu đúng.`;
        } else {
          instruction = `Hãy tạo một câu hỏi trắc nghiệm điền từ (4 đáp án A, B, C, D) để kiểm tra cách dùng của từ "${word}". Trả về JSON chứa questionZh, questionPinyin, options, answer, explanationVi.`;
        }

        const prompt = `Bạn là gia sư tiếng Trung AI đồng hành thông thái của ứng dụng Halo Chinese.
Yêu cầu: ${instruction}

Định dạng trả về: JSON thuần túy (không bọc trong markdown code fence) có cấu trúc:
{
  "title": "tiêu đề ngắn gọn của lời giải thích",
  "contentVi": "nội dung giải thích chi tiết, trình bày mạch lạc bằng tiếng Việt, dùng markdown định dạng in đậm nổi bật",
  "quizData": ${params.promptType === 'sentence_quiz' ? '{"questionZh": "...", "questionPinyin": "...", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "answer": "...", "explanationVi": "..."}' : 'null'}
}`;

        const startDictCall = Date.now();
        const targetModel = geminiTextService.getModel();
        const cleanJson = await unifiedAIOrchestrator.invokeWithTimeoutAndRetry(
          targetModel,
          'Bạn là chuyên gia ngôn ngữ học tiếng Trung. Chỉ trả về JSON thuần túy.',
          prompt,
          'json',
          0.2,
          20000,
          1
        );
        unifiedAIOrchestrator.logAudit({
          requestId: `req_dict_context_${Date.now()}`,
          taskId: 'EXPLAIN_VOCABULARY',
          modelCategory: 'text_out',
          modelId: targetModel,
          promptVersion: 'v2.8.0',
          status: 'completed',
          latencyMs: Date.now() - startDictCall
        });

        if (cleanJson) {
          const parsed = JSON.parse(cleanJson);
          return {
            word,
            promptType: params.promptType,
            title: parsed.title || `Tư vấn AI về từ: ${word}`,
            contentVi: parsed.contentVi || 'Đang cập nhật nội dung giải thích từ AI.',
            quizData: parsed.quizData || undefined
          };
        }
      } catch (err) {
        console.warn('[Dictionary] Ask AI about word notice:', err);
      }
    }

    // Fallback nếu không có internet hoặc API key
    return {
      word,
      promptType: params.promptType,
      title: `Thông tin từ điển chuẩn: ${word}`,
      contentVi: `Từ **${word}** (${localEntry?.pinyin || ''}) mang nghĩa: **${localEntry?.meaningVi || 'Đang cập nhật'}**.\n\n` +
        `• Từ loại: ${localEntry?.wordType || 'Từ vựng'}\n` +
        `• Cấp độ: HSK ${localEntry?.hskLevel || 1}\n` +
        `• Ví dụ tham khảo: ${localEntry?.examples?.[0]?.zh || ''} (${localEntry?.examples?.[0]?.vi || ''})`
    };
  }

  /**
   * Lưu hoặc cập nhật ghi chú cá nhân của người học cho từ
   */
  public savePersonalNote(params: {
    entryId: string;
    note: string;
    tags?: string[];
  }): { success: boolean; message: string } {
    const now = Date.now();
    try {
      const existing = db.prepare('SELECT id FROM dictionary_personal_notes WHERE entry_id = ?').get(params.entryId) as any;
      if (existing) {
        db.prepare(`
          UPDATE dictionary_personal_notes
          SET personal_note = ?, tags_json = ?, updated_at = ?
          WHERE id = ?
        `).run(params.note, JSON.stringify(params.tags || []), now, existing.id);
      } else {
        const noteId = `note_${now}_${Math.random().toString(36).substring(2, 6)}`;
        db.prepare(`
          INSERT INTO dictionary_personal_notes (id, user_id, entry_id, is_favorite, personal_note, tags_json, lookup_count, last_looked_up_at, created_at, updated_at)
          VALUES (?, 'default', ?, 0, ?, ?, 1, ?, ?, ?)
        `).run(noteId, params.entryId, params.note, JSON.stringify(params.tags || []), now, now, now);
      }
      return { success: true, message: 'Đã lưu ghi chú cá nhân thành công!' };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  /**
   * Thêm/Bỏ yêu thích một từ
   */
  public toggleFavorite(entryId: string): { success: boolean; isFavorite: boolean } {
    const now = Date.now();
    const existing = db.prepare('SELECT id, is_favorite FROM dictionary_personal_notes WHERE entry_id = ?').get(entryId) as any;

    if (existing) {
      const newStatus = existing.is_favorite === 1 ? 0 : 1;
      db.prepare('UPDATE dictionary_personal_notes SET is_favorite = ?, updated_at = ? WHERE id = ?').run(newStatus, now, existing.id);
      return { success: true, isFavorite: newStatus === 1 };
    } else {
      const noteId = `note_${now}_${Math.random().toString(36).substring(2, 6)}`;
      db.prepare(`
        INSERT INTO dictionary_personal_notes (id, user_id, entry_id, is_favorite, personal_note, tags_json, lookup_count, last_looked_up_at, created_at, updated_at)
        VALUES (?, 'default', ?, 1, '', '[]', 1, ?, ?, ?)
      `).run(noteId, entryId, now, now, now);
      return { success: true, isFavorite: true };
    }
  }

  /**
   * Đồng bộ từ vựng vào Bộ nhớ học tập (vocabulary_memory)
   */
  public syncToLearnerMemory(entryId: string): { success: boolean; memoryId: number; message: string } {
    const entry = db.prepare('SELECT * FROM dictionary_entries WHERE id = ?').get(entryId) as any;
    if (!entry) throw new Error('Không tìm thấy từ trong từ điển để lưu vào bộ nhớ.');

    const now = Date.now();

    // Kiểm tra xem đã có trong vocabulary_memory chưa (chống tạo bản ghi trùng lặp)
    const existing = db.prepare('SELECT id FROM vocabulary_memory WHERE simplified = ?').get(entry.simplified) as any;
    let memoryId = existing?.id;

    if (!existing) {
      const info = db.prepare(`
        INSERT INTO vocabulary_memory (
          simplified, traditional, pinyin, meaning_vi, word_type,
          hsk_level, examples_json, first_taught_at, last_reviewed_at,
          review_count, mastery_level, source_session_id, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'introduced', 'dictionary_manual', ?)
      `).run(
        entry.simplified,
        entry.traditional || null,
        entry.pinyin,
        entry.meaning_vi,
        entry.word_type,
        entry.hsk_level,
        entry.examples_json,
        now,
        now,
        `Thêm từ Từ điển tiếng Trung: ${entry.meaning_vi}`
      );
      memoryId = Number(info.lastInsertRowid);
    }

    // Liên kết ID vào dictionary_personal_notes
    try {
      const note = db.prepare('SELECT id FROM dictionary_personal_notes WHERE entry_id = ?').get(entryId) as any;
      if (note) {
        db.prepare('UPDATE dictionary_personal_notes SET vocab_memory_id = ?, updated_at = ? WHERE id = ?')
          .run(memoryId, now, note.id);
      } else {
        const noteId = `note_${now}_${Math.random().toString(36).substring(2, 6)}`;
        db.prepare(`
          INSERT INTO dictionary_personal_notes (id, user_id, entry_id, vocab_memory_id, is_favorite, personal_note, tags_json, lookup_count, last_looked_up_at, created_at, updated_at)
          VALUES (?, 'default', ?, ?, 0, '', '[]', 1, ?, ?, ?)
        `).run(noteId, entryId, memoryId, now, now, now);
      }
    } catch {}

    return {
      success: true,
      memoryId,
      message: `Đã liên kết từ "${entry.simplified}" vào Bộ nhớ học tập dài hạn!`
    };
  }

  /**
   * Đồng bộ từ vào Hàng đợi Ôn tập Thông minh SRS (SM-2)
   */
  public syncToSrs(entryId: string): { success: boolean; srsId: string; message: string } {
    const entry = db.prepare('SELECT * FROM dictionary_entries WHERE id = ?').get(entryId) as any;
    if (!entry) throw new Error('Không tìm thấy từ mục tiêu.');

    const now = Date.now();
    const uniqueKey = `dict_${entry.id}`;

    // Kiểm tra trùng trong srs_items
    const existing = db.prepare('SELECT id FROM srs_items WHERE unique_key = ? OR prompt_zh = ?').get(uniqueKey, entry.simplified) as any;
    if (existing) {
      return {
        success: true,
        srsId: existing.id,
        message: `Từ "${entry.simplified}" đã sẵn sàng trong hàng đợi ôn tập thông minh SRS.`
      };
    }

    const srsId = `srs_dict_${now}_${Math.random().toString(36).substring(2, 6)}`;
    db.prepare(`
      INSERT INTO srs_items (
        id, item_type, reference_id, unique_key, hsk_level,
        prompt_zh, prompt_pinyin, prompt_vi, extra_data_json,
        ease_factor, interval_days, repetition_count, streak, lapses,
        next_review_at, mastery_level, status, created_at, updated_at
      ) VALUES (?, 'vocabulary', ?, ?, ?, ?, ?, ?, ?, 2.5, 1, 0, 0, 0, ?, 'learning', 'active', ?, ?)
    `).run(
      srsId,
      entry.id,
      uniqueKey,
      entry.hsk_level,
      entry.simplified,
      entry.pinyin,
      entry.meaning_vi,
      JSON.stringify({
        traditional: entry.traditional,
        wordType: entry.word_type,
        radical: entry.radical,
        strokeCount: entry.stroke_count,
        examples: entry.examples_json ? JSON.parse(entry.examples_json) : []
      }),
      now + 86400000, // Đến hạn sau 1 ngày
      now,
      now
    );

    // Cập nhật liên kết trong dictionary_personal_notes
    try {
      db.prepare('UPDATE dictionary_personal_notes SET srs_item_id = ?, updated_at = ? WHERE entry_id = ?')
        .run(srsId, now, entryId);
    } catch {}

    return {
      success: true,
      srsId,
      message: `Đã tạo thẻ ôn tập thông minh SRS (SM-2) cho từ "${entry.simplified}"!`
    };
  }

  /**
   * Lấy lịch sử tra cứu gần nhất
   */
  public getHistory(limit: number = 20): any[] {
    const rows = db.prepare(`
      SELECT h.*, e.simplified, e.pinyin, e.meaning_vi, e.hsk_level
      FROM dictionary_history h
      LEFT JOIN dictionary_entries e ON h.result_entry_id = e.id
      ORDER BY h.created_at DESC
      LIMIT ?
    `).all(limit) as any[];

    return rows.map(r => ({
      id: r.id,
      query: r.query,
      queryType: r.query_type,
      contextSentence: r.context_sentence,
      entry: r.simplified ? {
        id: r.result_entry_id,
        simplified: r.simplified,
        pinyin: r.pinyin,
        meaningVi: r.meaning_vi,
        hskLevel: r.hsk_level
      } : null,
      createdAt: r.created_at
    }));
  }

  /**
   * Lấy danh sách từ đã lưu / yêu thích
   */
  public getFavorites(): any[] {
    const rows = db.prepare(`
      SELECT n.*, e.simplified, e.traditional, e.pinyin, e.meaning_vi, e.word_type, e.hsk_level, e.radical
      FROM dictionary_personal_notes n
      JOIN dictionary_entries e ON n.entry_id = e.id
      WHERE n.is_favorite = 1
      ORDER BY n.updated_at DESC
    `).all() as any[];

    return rows.map(r => ({
      id: r.id,
      entryId: r.entry_id,
      simplified: r.simplified,
      traditional: r.traditional,
      pinyin: r.pinyin,
      meaningVi: r.meaning_vi,
      wordType: r.word_type,
      hskLevel: r.hsk_level,
      radical: r.radical,
      personalNote: r.personal_note,
      tags: r.tags_json ? JSON.parse(r.tags_json) : [],
      lookupCount: r.lookup_count,
      lastLookedUpAt: r.last_looked_up_at
    }));
  }

  /**
   * Tự động sinh từ điển bằng AI khi từ chưa có trong seed data và lưu cache SQLite
   */
  private async generateEntryWithAI(word: string): Promise<any | null> {
    const apiKey = geminiTextService.getApiKey();
    if (!apiKey) return null;

    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Bạn là biên tập viên từ điển Hán - Việt tiêu chuẩn quốc gia.
Hãy biên soạn một mục từ điển chính xác cho từ tiếng Trung: "${word}".

Yêu cầu trả về JSON thuần túy (không bọc trong markdown code fence) có cấu trúc:
{
  "simplified": "${word}",
  "traditional": "chữ phồn thể tương ứng nếu có",
  "pinyin": "phiên âm Pinyin đầy đủ có dấu thanh",
  "meaningVi": "nghĩa tiếng Việt chính xác và phổ biến nhất",
  "wordType": "từ loại (Danh từ / Động từ / Tính từ / Phó từ...)",
  "hskLevel": 3,
  "radical": "Bộ thủ (ví dụ: 木 (Mộc))",
  "strokeCount": 10,
  "characterDecomposition": "cấu tạo chi tiết các thành phần nét",
  "measureWords": "lượng từ đi kèm nếu có",
  "synonyms": ["từ đồng nghĩa 1"],
  "antonyms": ["từ trái nghĩa 1"],
  "collocations": ["cụm từ ghép 1", "cụm từ ghép 2"],
  "examples": [
    {
      "zh": "câu ví dụ chữ Hán",
      "pinyin": "phiên âm câu ví dụ",
      "vi": "dịch nghĩa câu ví dụ"
    }
  ]
}`;

      const startDictCall = Date.now();
      const targetModel = geminiTextService.getModel();
      const cleanJson = await unifiedAIOrchestrator.invokeWithTimeoutAndRetry(
        targetModel,
        'Bạn là chuyên gia ngôn ngữ học tiếng Trung. Chỉ trả về JSON thuần túy.',
        prompt,
        'json',
        0.2,
        20000,
        1
      );
      unifiedAIOrchestrator.logAudit({
        requestId: `req_dict_breakdown_${Date.now()}`,
        taskId: 'ANALYZE_SENTENCE',
        modelCategory: 'text_out',
        modelId: targetModel,
        promptVersion: 'v2.8.0',
        status: 'completed',
        latencyMs: Date.now() - startDictCall
      });

      if (cleanJson) {
        const parsed = JSON.parse(cleanJson);
        const now = Date.now();
        const id = `dict_ai_${now}_${Math.random().toString(36).substring(2, 6)}`;
        const pinyinClean = normalizePinyin(parsed.pinyin || '');

        db.prepare(`
          INSERT INTO dictionary_entries (
            id, simplified, traditional, pinyin, pinyin_clean, meaning_vi,
            word_type, hsk_level, radical, stroke_count, character_decomposition,
            measure_words, synonyms_json, antonyms_json, collocations_json,
            examples_json, source, version, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'gemini_ai_verified', '1.0', ?, ?)
        `).run(
          id,
          parsed.simplified || word,
          parsed.traditional || null,
          parsed.pinyin || '',
          pinyinClean,
          parsed.meaningVi || 'Ý nghĩa xác thực bởi AI',
          parsed.wordType || 'Từ vựng',
          parsed.hskLevel || 3,
          parsed.radical || null,
          parsed.strokeCount || 1,
          parsed.characterDecomposition || null,
          parsed.measureWords || null,
          parsed.synonyms ? JSON.stringify(parsed.synonyms) : null,
          parsed.antonyms ? JSON.stringify(parsed.antonyms) : null,
          parsed.collocations ? JSON.stringify(parsed.collocations) : null,
          JSON.stringify(parsed.examples || []),
          now,
          now
        );

        return db.prepare('SELECT * FROM dictionary_entries WHERE id = ?').get(id);
      }
    } catch (err) {
      console.warn('[Dictionary] Generate entry with AI notice:', err);
    }
    return null;
  }
}

export const geminiDictionaryService = new GeminiDictionaryService();
