import { db } from './db.js';
import { generatePrefixedId, KnowledgePrefix } from './utils/idGenerator.js';
import { pinyin } from 'pinyin-pro';
import fs from 'fs';
import path from 'path';

export type KnowledgeItemType =
  | 'vocabulary'
  | 'grammar'
  | 'sentence_pattern'
  | 'pronunciation'
  | 'reading_concept'
  | 'listening_concept';

export type KnowledgeStatus = 'active' | 'archived' | 'needs_review';

export type KnowledgeRelationType =
  | 'similar' // Tương tự
  | 'opposite' // Đối lập / trái nghĩa
  | 'synonym' // Đồng nghĩa
  | 'near_synonym' // Gần nghĩa
  | 'example_of' // Là ví dụ của
  | 'prerequisite' // Phụ thuộc vào / tiên quyết
  | 'advanced_of' // Là kiến thức nâng cao của
  | 'confused_with' // Thường bị nhầm với
  | 'topic_related'; // Liên quan đến chủ đề

export interface KnowledgeSense {
  id: string;
  knowledgeId: string;
  senseIndex: number;
  wordType: string;
  meaningVi: string;
  meaningEn?: string;
  contextDescription?: string;
  register?: string;
  measureWords?: string;
  examples: Array<{
    zh: string;
    pinyin?: string;
    vi: string;
    context?: string;
  }>;
  status: 'active' | 'archived';
  createdAt: number;
  updatedAt: number;
}

export interface KnowledgeRelationView {
  id: string;
  sourceId: string;
  targetId: string;
  targetDisplayText: string;
  targetItemType: KnowledgeItemType;
  targetPinyin?: string;
  relationType: KnowledgeRelationType;
  weight: number;
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: number;
}

export interface KnowledgeItem {
  id: string;
  itemType: KnowledgeItemType;
  canonicalKey: string;
  displayText: string;
  hanziSimplified?: string;
  hanziTraditional?: string;
  pinyin?: string;
  pinyinClean?: string;
  hskLevel: number;
  hskVersion: string;
  difficultyScore: number;
  category?: string;
  formula?: string;
  communicativeGoal?: string;
  usageConditions?: string;
  tags: string[];
  commonMistakes: string[];
  metadata: Record<string, any>;
  status: KnowledgeStatus;
  source: string;
  version: number;
  createdAt: number;
  updatedAt: number;
  senses?: KnowledgeSense[];
  relations?: KnowledgeRelationView[];
  aliases?: string[];
}

export interface CreateKnowledgeInput {
  itemType: KnowledgeItemType;
  canonicalKey?: string;
  displayText: string;
  hanziSimplified?: string;
  hanziTraditional?: string;
  pinyin?: string;
  pinyinClean?: string;
  hskLevel?: number;
  hskVersion?: string;
  difficultyScore?: number;
  category?: string;
  formula?: string;
  communicativeGoal?: string;
  usageConditions?: string;
  tags?: string[];
  commonMistakes?: string[];
  metadata?: Record<string, any>;
  source?: string;
  initialSense?: {
    wordType?: string;
    meaningVi: string;
    meaningEn?: string;
    contextDescription?: string;
    register?: string;
    measureWords?: string;
    examples?: Array<{ zh: string; pinyin?: string; vi: string; context?: string }>;
  };
  aliases?: string[];
}

export interface FindKnowledgeParams {
  query?: string;
  itemType?: KnowledgeItemType;
  hskLevel?: number;
  status?: KnowledgeStatus;
  category?: string;
  tag?: string;
  limit?: number;
  offset?: number;
}

export interface KnowledgeDedupCandidate {
  id: string;
  primaryKnowledgeId: string;
  candidateKnowledgeId: string;
  similarityScore: number;
  matchType: string;
  status: 'pending' | 'merged' | 'rejected' | 'verified_distinct';
  reason: string;
  createdAt: number;
  resolvedAt?: number;
}

export interface RegistryStats {
  totalItems: number;
  byType: Record<KnowledgeItemType, number>;
  totalSenses: number;
  totalRelations: number;
  totalAliases: number;
  pendingDedupCandidates: number;
  orphanCheck: {
    orphanSenses: number;
    orphanRelations: number;
    orphanMappings: number;
    isHealthy: boolean;
  };
}

/**
 * Chuẩn hóa Pinyin loại bỏ dấu thanh điệu, khoảng trắng và ký tự đặc biệt
 */
export function cleanPinyin(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[āáǎà]/g, 'a')
    .replace(/[ōóǒò]/g, 'o')
    .replace(/[ēéěè]/g, 'e')
    .replace(/[īíǐì]/g, 'i')
    .replace(/[ūúǔù]/g, 'u')
    .replace(/[ǖǘǚǜü]/g, 'v')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Service Quản lý Knowledge Registry Trung Tâm
 * Nguồn định danh tri thức duy nhất và chính thức cho toàn bộ ứng dụng
 */
export class KnowledgeRegistryService {
  private getPrefixForType(type: KnowledgeItemType): KnowledgePrefix {
    switch (type) {
      case 'vocabulary':
        return 'VOC';
      case 'grammar':
        return 'GRA';
      case 'sentence_pattern':
        return 'PAT';
      case 'pronunciation':
        return 'PRO';
      case 'reading_concept':
        return 'REA';
      case 'listening_concept':
        return 'LIS';
      default:
        return 'VOC';
    }
  }

  /**
   * Tạo canonical key chuẩn hóa
   */
  public generateCanonicalKey(type: KnowledgeItemType, text: string, pinyinInput?: string): string {
    const prefix = type.substring(0, 3).toLowerCase();
    const cleanText = text.trim();
    if (type === 'vocabulary') {
      const pClean = cleanPinyin(pinyinInput || pinyin(cleanText, { toneType: 'none' }) || cleanText);
      return `${prefix}_${pClean || cleanText.toLowerCase()}`;
    }
    const slug = cleanText
      .toLowerCase()
      .replace(/[\s+()（）/.,?!，。？！]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 40);
    return `${prefix}_${slug}`;
  }

  /**
   * 1. Tạo mới một Knowledge Item
   */
  public createKnowledge(input: CreateKnowledgeInput): KnowledgeItem {
    const now = Date.now();
    const prefix = this.getPrefixForType(input.itemType);
    const id = generatePrefixedId(prefix, now);

    let py = input.pinyin;
    if (!py && (input.itemType === 'vocabulary' || input.hanziSimplified)) {
      py = pinyin(input.hanziSimplified || input.displayText);
    }
    const pyClean = input.pinyinClean || cleanPinyin(py || '');
    const canonicalKey = input.canonicalKey || this.generateCanonicalKey(input.itemType, input.displayText, py);

    const transaction = db.transaction(() => {
      // 1. Chèn vào knowledge_items
      db.prepare(`
        INSERT INTO knowledge_items (
          id, item_type, canonical_key, display_text, hanzi_simplified, hanzi_traditional,
          pinyin, pinyin_clean, hsk_level, hsk_version, difficulty_score, category,
          formula, communicative_goal, usage_conditions, tags_json, common_mistakes_json,
          metadata_json, status, source, version, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        input.itemType,
        canonicalKey,
        input.displayText.trim(),
        input.hanziSimplified?.trim() || null,
        input.hanziTraditional?.trim() || null,
        py || null,
        pyClean || null,
        input.hskLevel || 1,
        input.hskVersion || '3.0',
        input.difficultyScore || 1.0,
        input.category || null,
        input.formula || null,
        input.communicativeGoal || null,
        input.usageConditions || null,
        JSON.stringify(input.tags || []),
        JSON.stringify(input.commonMistakes || []),
        JSON.stringify(input.metadata || {}),
        'active',
        input.source || 'system',
        1,
        now,
        now
      );

      // 2. Chèn Sense đầu tiên nếu có
      if (input.initialSense) {
        const senseId = generatePrefixedId('SNS', now);
        db.prepare(`
          INSERT INTO knowledge_senses (
            id, knowledge_id, sense_index, word_type, meaning_vi, meaning_en,
            context_description, register, measure_words, examples_json, status,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          senseId,
          id,
          1,
          input.initialSense.wordType || input.category || 'từ vựng',
          input.initialSense.meaningVi.trim(),
          input.initialSense.meaningEn || null,
          input.initialSense.contextDescription || null,
          input.initialSense.register || 'thông dụng',
          input.initialSense.measureWords || null,
          JSON.stringify(input.initialSense.examples || []),
          'active',
          now,
          now
        );
      }

      // 3. Chèn Aliases (Phiên âm, pinyin sạch, phồn thể, v.v.)
      const aliasesToInsert: Array<{ alias: string; type: string }> = [];
      if (pyClean && pyClean !== input.displayText) {
        aliasesToInsert.push({ alias: pyClean, type: 'pinyin_clean' });
      }
      if (py && py !== pyClean) {
        aliasesToInsert.push({ alias: py, type: 'pinyin_tone' });
      }
      if (input.hanziTraditional && input.hanziTraditional !== input.hanziSimplified) {
        aliasesToInsert.push({ alias: input.hanziTraditional, type: 'traditional' });
      }
      if (input.aliases && input.aliases.length > 0) {
        for (const a of input.aliases) {
          if (a && !aliasesToInsert.some(item => item.alias === a)) {
            aliasesToInsert.push({ alias: a, type: 'alternate_spelling' });
          }
        }
      }

      const insertAlias = db.prepare(`
        INSERT INTO knowledge_aliases (id, knowledge_id, alias, alias_type, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (const a of aliasesToInsert) {
        insertAlias.run(generatePrefixedId('ALI', now), id, a.alias, a.type, now);
      }
    });

    transaction();
    return this.getKnowledgeById(id)!;
  }

  /**
   * 2. Lấy Knowledge Item chi tiết theo ID
   */
  public getKnowledgeById(
    id: string,
    options: { includeSenses?: boolean; includeRelations?: boolean; includeAliases?: boolean } = {
      includeSenses: true,
      includeRelations: true,
      includeAliases: true
    }
  ): KnowledgeItem | null {
    const row = db.prepare('SELECT * FROM knowledge_items WHERE id = ?').get(id) as any;
    if (!row) return null;

    const item: KnowledgeItem = {
      id: row.id,
      itemType: row.item_type,
      canonicalKey: row.canonical_key,
      displayText: row.display_text,
      hanziSimplified: row.hanzi_simplified || undefined,
      hanziTraditional: row.hanzi_traditional || undefined,
      pinyin: row.pinyin || undefined,
      pinyinClean: row.pinyin_clean || undefined,
      hskLevel: row.hsk_level,
      hskVersion: row.hsk_version,
      difficultyScore: row.difficulty_score,
      category: row.category || undefined,
      formula: row.formula || undefined,
      communicativeGoal: row.communicative_goal || undefined,
      usageConditions: row.usage_conditions || undefined,
      tags: row.tags_json ? JSON.parse(row.tags_json) : [],
      commonMistakes: row.common_mistakes_json ? JSON.parse(row.common_mistakes_json) : [],
      metadata: row.metadata_json ? JSON.parse(row.metadata_json) : {},
      status: row.status,
      source: row.source,
      version: row.version,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    if (options.includeSenses !== false) {
      item.senses = this.getSenses(id);
    }

    if (options.includeRelations !== false) {
      item.relations = this.getRelatedKnowledge(id);
    }

    if (options.includeAliases !== false) {
      const aliasRows = db.prepare('SELECT alias FROM knowledge_aliases WHERE knowledge_id = ?').all(id) as any[];
      item.aliases = aliasRows.map(r => r.alias);
    }

    return item;
  }

  /**
   * 3. Tìm kiếm Knowledge Items đa tiêu chí
   */
  public findKnowledge(params: FindKnowledgeParams): KnowledgeItem[] {
    let sql = 'SELECT DISTINCT ki.* FROM knowledge_items ki';
    const conditions: string[] = [];
    const args: any[] = [];
    const orderArgs: any[] = [];

    // Nếu tìm theo query (Hán tự, Pinyin, Pinyin sạch, hoặc Nghĩa tiếng Việt)
    if (params.query && params.query.trim()) {
      const q = params.query.trim();
      let pinyinCleanQuery = '';
      if (/[a-zA-Z]/.test(q)) {
        pinyinCleanQuery = cleanPinyin(q);
      } else if (/[\u4e00-\u9fa5]/.test(q)) {
        pinyinCleanQuery = cleanPinyin(pinyin(q, { toneType: 'none' }));
      }

      sql += `
        LEFT JOIN knowledge_senses ks ON ki.id = ks.knowledge_id
        LEFT JOIN knowledge_aliases ka ON ki.id = ka.knowledge_id
      `;

      const subConds = [
        'ki.display_text LIKE ?',
        'ki.hanzi_simplified LIKE ?',
        'ki.hanzi_traditional LIKE ?',
        'ki.pinyin LIKE ?',
        'ks.meaning_vi LIKE ?'
      ];
      const likePattern = `%${q}%`;
      args.push(likePattern, likePattern, likePattern, likePattern, likePattern);

      if (pinyinCleanQuery && pinyinCleanQuery.length > 0) {
        subConds.push('ki.pinyin_clean LIKE ?', 'ka.alias LIKE ?', 'ki.canonical_key LIKE ?');
        const cleanPattern = `%${pinyinCleanQuery}%`;
        args.push(cleanPattern, cleanPattern, cleanPattern);
      }

      conditions.push(`(${subConds.join(' OR ')})`);
      orderArgs.push(q, q, `${q}%`, `${q}%`);
    }

    if (params.itemType) {
      conditions.push('ki.item_type = ?');
      args.push(params.itemType);
    }

    if (params.hskLevel !== undefined) {
      conditions.push('ki.hsk_level = ?');
      args.push(params.hskLevel);
    }

    if (params.status) {
      conditions.push('ki.status = ?');
      args.push(params.status);
    } else {
      conditions.push("ki.status != 'archived'");
    }

    if (params.category) {
      conditions.push('ki.category = ?');
      args.push(params.category);
    }

    if (params.tag) {
      conditions.push('ki.tags_json LIKE ?');
      args.push(`%"${params.tag}"%`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    if (orderArgs.length === 4) {
      sql += `
        ORDER BY
          CASE
            WHEN ki.display_text = ? OR ki.hanzi_simplified = ? THEN 1
            WHEN ki.display_text LIKE ? OR ki.hanzi_simplified LIKE ? THEN 2
            ELSE 3
          END,
          ki.hsk_level ASC,
          ki.display_text ASC
      `;
      args.push(...orderArgs);
    } else {
      sql += ' ORDER BY ki.hsk_level ASC, ki.display_text ASC';
    }

    if (params.limit) {
      sql += ' LIMIT ?';
      args.push(params.limit);
      if (params.offset) {
        sql += ' OFFSET ?';
        args.push(params.offset);
      }
    }

    const rows = db.prepare(sql).all(...args) as any[];
    return rows.map(r => this.getKnowledgeById(r.id, { includeSenses: true, includeRelations: false })!);
  }

  /**
   * 4. Tìm hoặc tạo mới với cơ chế Chống Trùng Lặp thông minh (Deduplication Guard)
   */
  public findOrCreateKnowledge(input: CreateKnowledgeInput): {
    item: KnowledgeItem;
    created: boolean;
    candidateDuplicate?: KnowledgeDedupCandidate;
  } {
    const cleanText = input.displayText.trim();
    const simplified = (input.hanziSimplified || cleanText).trim();
    const py = input.pinyin || (input.itemType === 'vocabulary' ? pinyin(simplified) : '');
    const pyClean = cleanPinyin(py);

    // 1. Kiểm tra chính xác theo canonical_key hoặc (item_type + hanzi_simplified)
    let existing = db.prepare(`
      SELECT * FROM knowledge_items
      WHERE item_type = ? AND (hanzi_simplified = ? OR display_text = ?) AND status != 'archived'
      LIMIT 1
    `).get(input.itemType, simplified, cleanText) as any;

    if (!existing && input.canonicalKey) {
      existing = db.prepare(`
        SELECT * FROM knowledge_items
        WHERE canonical_key = ? AND status != 'archived'
        LIMIT 1
      `).get(input.canonicalKey) as any;
    }

    // 2. Nếu đã tồn tại thực thể kiến thức này
    if (existing) {
      const fullItem = this.getKnowledgeById(existing.id)!;

      // Kiểm tra xem ý nghĩa mới đã tồn tại trong các sense chưa
      if (input.initialSense?.meaningVi) {
        const newMeaning = input.initialSense.meaningVi.toLowerCase().trim();
        const senseExists = fullItem.senses?.some(
          s => s.meaningVi.toLowerCase().includes(newMeaning) || newMeaning.includes(s.meaningVi.toLowerCase())
        );

        // Nếu là một nghĩa hoàn toàn mới của từ, tự động tạo thêm một Sense riêng biệt
        if (!senseExists) {
          this.addSense(existing.id, {
            wordType: input.initialSense.wordType || input.category || fullItem.category || 'từ vựng',
            meaningVi: input.initialSense.meaningVi,
            meaningEn: input.initialSense.meaningEn,
            contextDescription: input.initialSense.contextDescription,
            register: input.initialSense.register,
            measureWords: input.initialSense.measureWords,
            examples: input.initialSense.examples
          });
        }
      }

      return {
        item: this.getKnowledgeById(existing.id)!,
        created: false
      };
    }

    // 3. Kiểm tra trường hợp đặc biệt: Từ Đa Âm (Polyphone / 多音字)
    // Cùng chữ Hán nhưng Pinyin khác biệt đáng kể (ví dụ: 行 xíng vs háng)
    if (input.itemType === 'vocabulary' && simplified) {
      const sameHanziDiffPinyin = db.prepare(`
        SELECT * FROM knowledge_items
        WHERE item_type = 'vocabulary' AND hanzi_simplified = ? AND pinyin_clean != ? AND status != 'archived'
        LIMIT 1
      `).get(simplified, pyClean) as any;

      if (sameHanziDiffPinyin) {
        // Tạo mục kiến thức mới cho cách đọc này, đồng thời tạo bản ghi ứng viên nghi ngờ trong dedup candidates
        const newItem = this.createKnowledge(input);
        const dupId = generatePrefixedId('DUP');
        db.prepare(`
          INSERT INTO knowledge_dedup_candidates (
            id, primary_knowledge_id, candidate_knowledge_id, similarity_score,
            match_type, status, reason, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          dupId,
          sameHanziDiffPinyin.id,
          newItem.id,
          0.85,
          'identical_hanzi_different_pinyin',
          'pending',
          `Cùng chữ Hán [${simplified}] nhưng khác cách đọc Pinyin: [${sameHanziDiffPinyin.pinyin}] vs [${py}]`,
          Date.now()
        );

        // Tự động kết nối quan hệ "similar" giữa 2 cách đọc của chữ Hán
        this.addRelation(
          newItem.id,
          sameHanziDiffPinyin.id,
          'similar',
          `Từ đa âm (多音字): ${simplified} đọc là ${py} và ${sameHanziDiffPinyin.pinyin}`
        );

        return {
          item: newItem,
          created: true,
          candidateDuplicate: {
            id: dupId,
            primaryKnowledgeId: sameHanziDiffPinyin.id,
            candidateKnowledgeId: newItem.id,
            similarityScore: 0.85,
            matchType: 'identical_hanzi_different_pinyin',
            status: 'pending',
            reason: `Cùng chữ Hán [${simplified}] nhưng khác Pinyin: [${sameHanziDiffPinyin.pinyin}] vs [${py}]`,
            createdAt: Date.now()
          }
        };
      }
    }

    // 4. Hoàn toàn mới -> Tạo mới
    const createdItem = this.createKnowledge(input);
    return {
      item: createdItem,
      created: true
    };
  }

  /**
   * 5. Cập nhật thông tin Knowledge Item (ID giữ nguyên tuyệt đối)
   */
  public updateKnowledge(id: string, updates: Partial<KnowledgeItem>): KnowledgeItem {
    const existing = db.prepare('SELECT * FROM knowledge_items WHERE id = ?').get(id) as any;
    if (!existing) {
      throw new Error(`Knowledge item với ID [${id}] không tồn tại.`);
    }

    const now = Date.now();
    const displayText = updates.displayText || existing.display_text;
    const py = updates.pinyin || existing.pinyin;
    const pyClean = updates.pinyinClean || (py ? cleanPinyin(py) : existing.pinyin_clean);

    db.prepare(`
      UPDATE knowledge_items SET
        display_text = ?,
        hanzi_simplified = ?,
        hanzi_traditional = ?,
        pinyin = ?,
        pinyin_clean = ?,
        hsk_level = ?,
        hsk_version = ?,
        difficulty_score = ?,
        category = ?,
        formula = ?,
        communicative_goal = ?,
        usage_conditions = ?,
        tags_json = ?,
        common_mistakes_json = ?,
        metadata_json = ?,
        status = ?,
        version = version + 1,
        updated_at = ?
      WHERE id = ?
    `).run(
      displayText,
      updates.hanziSimplified !== undefined ? updates.hanziSimplified : existing.hanzi_simplified,
      updates.hanziTraditional !== undefined ? updates.hanziTraditional : existing.hanzi_traditional,
      py,
      pyClean,
      updates.hskLevel !== undefined ? updates.hskLevel : existing.hsk_level,
      updates.hskVersion || existing.hsk_version,
      updates.difficultyScore !== undefined ? updates.difficultyScore : existing.difficulty_score,
      updates.category !== undefined ? updates.category : existing.category,
      updates.formula !== undefined ? updates.formula : existing.formula,
      updates.communicativeGoal !== undefined ? updates.communicativeGoal : existing.communicative_goal,
      updates.usageConditions !== undefined ? updates.usageConditions : existing.usage_conditions,
      updates.tags ? JSON.stringify(updates.tags) : existing.tags_json,
      updates.commonMistakes ? JSON.stringify(updates.commonMistakes) : existing.common_mistakes_json,
      updates.metadata ? JSON.stringify(updates.metadata) : existing.metadata_json,
      updates.status || existing.status,
      now,
      id
    );

    return this.getKnowledgeById(id)!;
  }

  /**
   * 6. Lấy danh sách quan hệ tri thức của một Item
   */
  public getRelatedKnowledge(id: string, relationType?: KnowledgeRelationType): KnowledgeRelationView[] {
    let sql = `
      SELECT kr.*, ki.display_text as target_display_text, ki.item_type as target_item_type, ki.pinyin as target_pinyin
      FROM knowledge_relations kr
      JOIN knowledge_items ki ON kr.target_id = ki.id
      WHERE kr.source_id = ?
    `;
    const args: any[] = [id];

    if (relationType) {
      sql += ' AND kr.relation_type = ?';
      args.push(relationType);
    }

    sql += ' ORDER BY kr.weight DESC, kr.created_at ASC';

    const rows = db.prepare(sql).all(...args) as any[];
    return rows.map(r => ({
      id: r.id,
      sourceId: r.source_id,
      targetId: r.target_id,
      targetDisplayText: r.target_display_text,
      targetItemType: r.target_item_type,
      targetPinyin: r.target_pinyin || undefined,
      relationType: r.relation_type,
      weight: r.weight,
      notes: r.notes || undefined,
      metadata: r.metadata_json ? JSON.parse(r.metadata_json) : undefined,
      createdAt: r.created_at
    }));
  }

  /**
   * 7. Thiết lập quan hệ tri thức hai chiều hoặc một chiều
   */
  public addRelation(
    sourceId: string,
    targetId: string,
    relationType: KnowledgeRelationType,
    notes?: string,
    metadata?: Record<string, any>,
    bidirectional: boolean = false
  ): KnowledgeRelationView {
    if (sourceId === targetId) {
      throw new Error('Không thể thiết lập quan hệ tri thức trỏ tới chính nó.');
    }

    const source = db.prepare('SELECT id FROM knowledge_items WHERE id = ?').get(sourceId);
    const target = db.prepare('SELECT id, display_text, item_type, pinyin FROM knowledge_items WHERE id = ?').get(targetId) as any;
    if (!source || !target) {
      throw new Error(`Một trong hai mục kiến thức [${sourceId}] hoặc [${targetId}] không tồn tại.`);
    }

    const now = Date.now();
    const id = generatePrefixedId('REL', now);

    db.prepare(`
      INSERT INTO knowledge_relations (
        id, source_id, target_id, relation_type, weight, notes, metadata_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(source_id, target_id, relation_type) DO UPDATE SET
        notes = excluded.notes,
        metadata_json = excluded.metadata_json,
        updated_at = excluded.updated_at
    `).run(
      id,
      sourceId,
      targetId,
      relationType,
      1.0,
      notes || null,
      metadata ? JSON.stringify(metadata) : null,
      now,
      now
    );

    // Nếu quan hệ đối xứng (synonym, confused_with, near_synonym, opposite, similar)
    if (bidirectional || ['synonym', 'confused_with', 'near_synonym', 'opposite', 'similar'].includes(relationType)) {
      const reverseId = generatePrefixedId('REL', now);
      db.prepare(`
        INSERT INTO knowledge_relations (
          id, source_id, target_id, relation_type, weight, notes, metadata_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(source_id, target_id, relation_type) DO UPDATE SET
          notes = excluded.notes,
          metadata_json = excluded.metadata_json,
          updated_at = excluded.updated_at
      `).run(
        reverseId,
        targetId,
        sourceId,
        relationType,
        1.0,
        notes || null,
        metadata ? JSON.stringify(metadata) : null,
        now,
        now
      );
    }

    return {
      id,
      sourceId,
      targetId,
      targetDisplayText: target.display_text,
      targetItemType: target.item_type,
      targetPinyin: target.pinyin,
      relationType,
      weight: 1.0,
      notes,
      metadata,
      createdAt: now
    };
  }

  /**
   * 8. Xóa quan hệ tri thức
   */
  public removeRelation(relationId: string): boolean {
    const res = db.prepare('DELETE FROM knowledge_relations WHERE id = ?').run(relationId);
    return res.changes > 0;
  }

  /**
   * 9. Lấy danh sách Senses của một Item
   */
  public getSenses(knowledgeId: string): KnowledgeSense[] {
    const rows = db.prepare(`
      SELECT * FROM knowledge_senses
      WHERE knowledge_id = ? AND status = 'active'
      ORDER BY sense_index ASC
    `).all(knowledgeId) as any[];

    return rows.map(r => ({
      id: r.id,
      knowledgeId: r.knowledge_id,
      senseIndex: r.sense_index,
      wordType: r.word_type,
      meaningVi: r.meaning_vi,
      meaningEn: r.meaning_en || undefined,
      contextDescription: r.context_description || undefined,
      register: r.register || undefined,
      measureWords: r.measure_words || undefined,
      examples: r.examples_json ? JSON.parse(r.examples_json) : [],
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  }

  /**
   * 10. Thêm Sense mới cho một Item
   */
  public addSense(
    knowledgeId: string,
    senseInput: {
      wordType?: string;
      meaningVi: string;
      meaningEn?: string;
      contextDescription?: string;
      register?: string;
      measureWords?: string;
      examples?: Array<{ zh: string; pinyin?: string; vi: string; context?: string }>;
    }
  ): KnowledgeSense {
    const item = db.prepare('SELECT id FROM knowledge_items WHERE id = ?').get(knowledgeId);
    if (!item) {
      throw new Error(`Knowledge item [${knowledgeId}] không tồn tại.`);
    }

    const now = Date.now();
    const senseId = generatePrefixedId('SNS', now);
    const maxIndexRow = db.prepare(`
      SELECT MAX(sense_index) as max_idx FROM knowledge_senses WHERE knowledge_id = ?
    `).get(knowledgeId) as any;
    const nextIndex = (maxIndexRow?.max_idx || 0) + 1;

    db.prepare(`
      INSERT INTO knowledge_senses (
        id, knowledge_id, sense_index, word_type, meaning_vi, meaning_en,
        context_description, register, measure_words, examples_json, status,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      senseId,
      knowledgeId,
      nextIndex,
      senseInput.wordType || 'từ vựng',
      senseInput.meaningVi.trim(),
      senseInput.meaningEn || null,
      senseInput.contextDescription || null,
      senseInput.register || 'thông dụng',
      senseInput.measureWords || null,
      JSON.stringify(senseInput.examples || []),
      'active',
      now,
      now
    );

    return {
      id: senseId,
      knowledgeId,
      senseIndex: nextIndex,
      wordType: senseInput.wordType || 'từ vựng',
      meaningVi: senseInput.meaningVi.trim(),
      meaningEn: senseInput.meaningEn,
      contextDescription: senseInput.contextDescription,
      register: senseInput.register,
      measureWords: senseInput.measureWords,
      examples: senseInput.examples || [],
      status: 'active',
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * 11. Hợp nhất hai mục kiến thức trùng lặp (Merge Knowledge)
   */
  public mergeKnowledge(
    sourceId: string,
    targetId: string,
    reason: string
  ): { success: boolean; targetItem: KnowledgeItem } {
    if (sourceId === targetId) {
      throw new Error('Không thể hợp nhất một mục kiến thức với chính nó.');
    }

    const source = this.getKnowledgeById(sourceId);
    const target = this.getKnowledgeById(targetId);
    if (!source || !target) {
      throw new Error('Cả hai mục kiến thức cần hợp nhất phải tồn tại.');
    }

    const now = Date.now();
    const transaction = db.transaction(() => {
      // 1. Chuyển tất cả senses của source sang target nếu chưa có
      const maxIndexRow = db.prepare(`
        SELECT MAX(sense_index) as max_idx FROM knowledge_senses WHERE knowledge_id = ?
      `).get(targetId) as any;
      let nextIndex = (maxIndexRow?.max_idx || 0) + 1;

      for (const sense of source.senses || []) {
        const alreadyExists = target.senses?.some(
          ts => ts.meaningVi.toLowerCase() === sense.meaningVi.toLowerCase()
        );
        if (!alreadyExists) {
          db.prepare(`
            UPDATE knowledge_senses
            SET knowledge_id = ?, sense_index = ?, updated_at = ?
            WHERE id = ?
          `).run(targetId, nextIndex++, now, sense.id);
        } else {
          // Lưu trữ sense trùng
          db.prepare(`UPDATE knowledge_senses SET status = 'archived', updated_at = ? WHERE id = ?`).run(now, sense.id);
        }
      }

      // 2. Chuyển các quan hệ tri thức
      db.prepare(`UPDATE knowledge_relations SET source_id = ? WHERE source_id = ?`).run(targetId, sourceId);
      db.prepare(`UPDATE knowledge_relations SET target_id = ? WHERE target_id = ?`).run(targetId, sourceId);

      // 3. Chuyển các aliases
      db.prepare(`UPDATE knowledge_aliases SET knowledge_id = ? WHERE knowledge_id = ?`).run(targetId, sourceId);

      // 4. Chuyển các bảng ánh xạ legacy
      db.prepare(`UPDATE knowledge_legacy_mapping SET knowledge_id = ? WHERE knowledge_id = ?`).run(targetId, sourceId);

      // 5. Cập nhật các bảng nghiệp vụ đang liên kết tới sourceId
      db.prepare(`UPDATE vocabulary_memory SET knowledge_id = ? WHERE knowledge_id = ?`).run(targetId, sourceId);
      db.prepare(`UPDATE grammar_memory SET knowledge_id = ? WHERE knowledge_id = ?`).run(targetId, sourceId);
      db.prepare(`UPDATE dictionary_entries SET knowledge_id = ? WHERE knowledge_id = ?`).run(targetId, sourceId);
      db.prepare(`UPDATE srs_items SET knowledge_id = ? WHERE knowledge_id = ?`).run(targetId, sourceId);
      db.prepare(`UPDATE learning_errors SET knowledge_id = ? WHERE knowledge_id = ?`).run(targetId, sourceId);
      db.prepare(`UPDATE learner_evidence_ledger SET knowledge_id = ? WHERE knowledge_id = ?`).run(targetId, sourceId);
      db.prepare(`UPDATE pronunciation_weaknesses SET knowledge_id = ? WHERE knowledge_id = ?`).run(targetId, sourceId);

      // 6. Đổi trạng thái sourceId thành 'archived' với metadata ghi nhận việc merge
      const updatedMeta = {
        ...source.metadata,
        mergedInto: targetId,
        mergedAt: now,
        mergeReason: reason
      };
      db.prepare(`
        UPDATE knowledge_items
        SET status = 'archived', metadata_json = ?, updated_at = ?
        WHERE id = ?
      `).run(JSON.stringify(updatedMeta), now, sourceId);

      // 7. Giải quyết các dedup candidate liên quan
      db.prepare(`
        UPDATE knowledge_dedup_candidates
        SET status = 'merged', resolved_at = ?
        WHERE (primary_knowledge_id = ? AND candidate_knowledge_id = ?)
           OR (primary_knowledge_id = ? AND candidate_knowledge_id = ?)
      `).run(now, sourceId, targetId, targetId, sourceId);
    });

    transaction();
    return {
      success: true,
      targetItem: this.getKnowledgeById(targetId)!
    };
  }

  /**
   * 12. Lưu trữ kiến thức (Soft Archive - không bao giờ làm hỏng quan hệ)
   */
  public archiveKnowledge(id: string): boolean {
    const res = db.prepare(`
      UPDATE knowledge_items SET status = 'archived', updated_at = ? WHERE id = ?
    `).run(Date.now(), id);
    return res.changes > 0;
  }

  /**
   * 13. Tự động rà soát phát hiện các ứng viên nghi ngờ trùng lặp (Dedup Candidates)
   */
  public detectDuplicates(): KnowledgeDedupCandidate[] {
    const candidates: KnowledgeDedupCandidate[] = [];

    // Tìm các cặp có cùng hanzi_simplified nhưng có 2 ID khác nhau đang active
    const identicalSimplified = db.prepare(`
      SELECT k1.id as id1, k2.id as id2, k1.hanzi_simplified, k1.pinyin as pinyin1, k2.pinyin as pinyin2
      FROM knowledge_items k1
      JOIN knowledge_items k2 ON k1.hanzi_simplified = k2.hanzi_simplified AND k1.id < k2.id
      WHERE k1.status = 'active' AND k2.status = 'active'
        AND k1.hanzi_simplified IS NOT NULL AND k1.hanzi_simplified != ''
    `).all() as any[];

    for (const pair of identicalSimplified) {
      const matchType = pair.pinyin1 === pair.pinyin2 ? 'potential_duplicate' : 'identical_hanzi_different_pinyin';
      const score = pair.pinyin1 === pair.pinyin2 ? 0.98 : 0.85;
      const reason =
        pair.pinyin1 === pair.pinyin2
          ? `Trùng hoàn toàn chữ Hán [${pair.hanzi_simplified}] và Pinyin [${pair.pinyin1}]`
          : `Cùng chữ Hán [${pair.hanzi_simplified}] nhưng khác Pinyin: [${pair.pinyin1}] vs [${pair.pinyin2}]`;

      // Kiểm tra xem đã ghi nhận candidate này chưa
      const exists = db.prepare(`
        SELECT id FROM knowledge_dedup_candidates
        WHERE primary_knowledge_id = ? AND candidate_knowledge_id = ?
      `).get(pair.id1, pair.id2) as any;

      if (!exists) {
        const dupId = generatePrefixedId('DUP');
        db.prepare(`
          INSERT INTO knowledge_dedup_candidates (
            id, primary_knowledge_id, candidate_knowledge_id, similarity_score,
            match_type, status, reason, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(dupId, pair.id1, pair.id2, score, matchType, 'pending', reason, Date.now());

        candidates.push({
          id: dupId,
          primaryKnowledgeId: pair.id1,
          candidateKnowledgeId: pair.id2,
          similarityScore: score,
          matchType,
          status: 'pending',
          reason,
          createdAt: Date.now()
        });
      }
    }

    return candidates;
  }

  /**
   * 14. Kiểm tra phát hiện dữ liệu mồ côi (Orphan Records Detection)
   */
  public findOrphanRecords(): { orphanSenses: number; orphanRelations: number; orphanMappings: number } {
    const orphanSenses = (db.prepare(`
      SELECT COUNT(*) as count FROM knowledge_senses
      WHERE knowledge_id NOT IN (SELECT id FROM knowledge_items)
    `).get() as any).count;

    const orphanRelations = (db.prepare(`
      SELECT COUNT(*) as count FROM knowledge_relations
      WHERE source_id NOT IN (SELECT id FROM knowledge_items)
         OR target_id NOT IN (SELECT id FROM knowledge_items)
    `).get() as any).count;

    const orphanMappings = (db.prepare(`
      SELECT COUNT(*) as count FROM knowledge_legacy_mapping
      WHERE knowledge_id NOT IN (SELECT id FROM knowledge_items)
    `).get() as any).count;

    return { orphanSenses, orphanRelations, orphanMappings };
  }

  /**
   * 15. Lấy báo cáo thống kê toàn diện về Knowledge Registry
   */
  public getRegistryStats(): RegistryStats {
    const totalItems = (db.prepare('SELECT COUNT(*) as count FROM knowledge_items').get() as any).count;
    const typeRows = db.prepare('SELECT item_type, COUNT(*) as count FROM knowledge_items GROUP BY item_type').all() as any[];
    const byType: Record<KnowledgeItemType, number> = {
      vocabulary: 0,
      grammar: 0,
      sentence_pattern: 0,
      pronunciation: 0,
      reading_concept: 0,
      listening_concept: 0
    };
    for (const r of typeRows) {
      if (r.item_type in byType) {
        byType[r.item_type as KnowledgeItemType] = r.count;
      }
    }

    const totalSenses = (db.prepare('SELECT COUNT(*) as count FROM knowledge_senses').get() as any).count;
    const totalRelations = (db.prepare('SELECT COUNT(*) as count FROM knowledge_relations').get() as any).count;
    const totalAliases = (db.prepare('SELECT COUNT(*) as count FROM knowledge_aliases').get() as any).count;
    const pendingDedupCandidates = (db.prepare("SELECT COUNT(*) as count FROM knowledge_dedup_candidates WHERE status = 'pending'").get() as any).count;

    const orphanCheck = this.findOrphanRecords();
    const isHealthy = orphanCheck.orphanSenses === 0 && orphanCheck.orphanRelations === 0 && orphanCheck.orphanMappings === 0;

    return {
      totalItems,
      byType,
      totalSenses,
      totalRelations,
      totalAliases,
      pendingDedupCandidates,
      orphanCheck: {
        ...orphanCheck,
        isHealthy
      }
    };
  }

  /**
   * 16. Khôi phục cơ sở dữ liệu từ bản sao lưu (Rollback Execution)
   */
  public restoreFromBackup(backupPath: string): boolean {
    if (!fs.existsSync(backupPath)) {
      throw new Error(`File sao lưu không tồn tại tại: ${backupPath}`);
    }
    const currentDbPath = path.resolve(process.cwd(), 'data', 'halo_chinese.db');
    db.pragma('wal_checkpoint(TRUNCATE)');
    fs.copyFileSync(backupPath, currentDbPath);
    return true;
  }
}

export const knowledgeRegistryService = new KnowledgeRegistryService();
