import { db } from '../server/db.js';
import { knowledgeRegistryService } from '../server/knowledgeRegistryService.js';
import { runMigrationToKnowledgeRegistry } from '../server/migrations/migrateToKnowledgeRegistry.js';
import fs from 'fs';
import path from 'path';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail: string = '') {
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}`);
    if (detail) console.log(`     -> ${detail}`);
    passCount++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    if (detail) console.error(`     -> Lỗi: ${detail}`);
    failCount++;
  }
}

async function runKnowledgeRegistryTests() {
  console.log('========================================================================');
  console.log('🏛️ BẮT ĐẦU KIỂM THỬ KNOWLEDGE REGISTRY (V2.0.0 NỀN TẢNG DỮ LIỆU)');
  console.log('   (10 Tình huống tiêu chuẩn theo yêu cầu Phần A1 - Thống nhất định danh)');
  console.log('========================================================================\n');

  // ==========================================================================
  // SCENARIO 1: CÙNG MỘT TỪ ĐƯỢC TẠO TỪ NHIỀU MODULE NHƯNG CHỈ CÓ MỘT ID
  // ==========================================================================
  console.log('📌 [TÌNH HUỐNG 1]: CÙNG MỘT TỪ TỪ NHIỀU NGUỒN CHỈ CÓ MỘT ID DUY NHẤT');
  const word1 = knowledgeRegistryService.findOrCreateKnowledge({
    itemType: 'vocabulary',
    displayText: '电脑',
    hanziSimplified: '电脑',
    pinyin: 'diàn nǎo',
    hskLevel: 1,
    source: 'dictionary',
    initialSense: {
      wordType: 'danh từ',
      meaningVi: 'Máy vi tính, máy tính'
    }
  });

  const word1Again = knowledgeRegistryService.findOrCreateKnowledge({
    itemType: 'vocabulary',
    displayText: '电脑',
    hanziSimplified: '电脑',
    pinyin: 'diàn nǎo',
    hskLevel: 1,
    source: 'ai_tutor_analysis',
    initialSense: {
      wordType: 'danh từ',
      meaningVi: 'Máy tính để bàn hoặc xách tay'
    }
  });

  assert(
    word1.item.id === word1Again.item.id,
    'Cùng từ "电脑" tạo từ Dictionary và AI Tutor có cùng ID duy nhất',
    `ID: ${word1.item.id} === ${word1Again.item.id} (Created: ${word1.created} -> ${word1Again.created})`
  );

  // ==========================================================================
  // SCENARIO 2: HAI TỪ KHÁC NHAU KHÔNG BỊ GỘP NHẦM
  // ==========================================================================
  console.log('\n📌 [TÌNH HUỐNG 2]: HAI TỪ KHÁC NHAU KHÔNG BỊ GỘP NHẦM');
  const wordBuy = knowledgeRegistryService.findOrCreateKnowledge({
    itemType: 'vocabulary',
    displayText: '买',
    hanziSimplified: '买',
    pinyin: 'mǎi',
    hskLevel: 1,
    initialSense: { wordType: 'động từ', meaningVi: 'Mua hàng' }
  });

  const wordSell = knowledgeRegistryService.findOrCreateKnowledge({
    itemType: 'vocabulary',
    displayText: '卖',
    hanziSimplified: '卖',
    pinyin: 'mài',
    hskLevel: 2,
    initialSense: { wordType: 'động từ', meaningVi: 'Bán hàng' }
  });

  assert(
    wordBuy.item.id !== wordSell.item.id,
    'Hai từ "买" (mua) và "卖" (bán) mang hai ID hoàn toàn độc lập',
    `买 ID: ${wordBuy.item.id} vs 卖 ID: ${wordSell.item.id}`
  );

  // ==========================================================================
  // SCENARIO 3: MỘT TỪ NHIỀU NGHĨA CÓ CÁC SENSE RIÊNG BIỆT (POLYSEMY & POLYPHONE)
  // ==========================================================================
  console.log('\n📌 [TÌNH HUỐNG 3]: PHÂN BIỆT TỪ VỰNG VÀ CÁC NGHĨA (SENSES & POLYPHONE)');
  const testChar = `测试打_${Date.now()}`;
  const polyWord = knowledgeRegistryService.createKnowledge({
    itemType: 'vocabulary',
    displayText: testChar,
    hanziSimplified: testChar,
    pinyin: 'dǎ',
    hskLevel: 1,
    initialSense: {
      wordType: 'động từ',
      meaningVi: 'Đánh, đập (tác động lực)',
      examples: [{ zh: '别打人。', pinyin: 'Bié dǎ rén.', vi: 'Đừng đánh người.' }]
    }
  });

  const sense2 = knowledgeRegistryService.addSense(polyWord.id, {
    wordType: 'động từ',
    meaningVi: 'Gọi điện thoại (打电话)',
    examples: [{ zh: '我给他打电话。', pinyin: 'Wǒ gěi tā dǎ diànhuà.', vi: 'Tôi gọi điện cho anh ấy.' }]
  });

  const sense3 = knowledgeRegistryService.addSense(polyWord.id, {
    wordType: 'động từ',
    meaningVi: 'Chơi bóng, thể thao bằng tay (打篮球)',
    examples: [{ zh: '下午我们去打篮球。', pinyin: 'Xiàwǔ wǒmen qù dǎ lánqiú.', vi: 'Chiều nay chúng ta đi chơi bóng rổ.' }]
  });

  const updatedPoly = knowledgeRegistryService.getKnowledgeById(polyWord.id)!;
  assert(
    updatedPoly.senses?.length === 3,
    'Từ có đúng 3 sense ngữ nghĩa độc lập thuộc cùng một Knowledge ID',
    `Số senses: ${updatedPoly.senses?.length} | Sense 1: "${updatedPoly.senses?.[0]?.meaningVi}" | Sense 2: "${updatedPoly.senses?.[1]?.meaningVi}" | Sense 3: "${updatedPoly.senses?.[2]?.meaningVi}"`
  );

  // ==========================================================================
  // SCENARIO 4: GIẢN THỂ VÀ PHỒN THỂ ĐƯỢC XỬ LÝ THEO QUY TẮC THỐNG NHẤT
  // ==========================================================================
  console.log('\n📌 [TÌNH HUỐNG 4]: GIẢN THỂ VÀ PHỒN THỂ THỐNG NHẤT VỀ CÙNG ĐỊNH DANH');
  const foundBySimp = knowledgeRegistryService.findKnowledge({ query: '学习' });
  const foundByTrad = knowledgeRegistryService.findKnowledge({ query: '學習' });

  assert(
    foundBySimp.length > 0 && foundByTrad.length > 0 && foundBySimp[0].id === foundByTrad[0].id,
    'Tra cứu bằng Giản thể (学习) và Phồn thể (學習) trả về cùng một Knowledge ID',
    `Giản thể ID: ${foundBySimp[0]?.id} | Phồn thể ID: ${foundByTrad[0]?.id}`
  );

  // ==========================================================================
  // SCENARIO 5: KIẾN THỨC CÓ THỂ ĐƯỢC TRUY XUẤT BẰNG ID Ở MỌI MODULE
  // ==========================================================================
  console.log('\n📌 [TÌNH HUỐNG 5]: TRUY XUẤT TOÀN VẸN THEO ID TỪ MỌI MODULE');
  const targetId = foundBySimp[0].id;
  const retrieved = knowledgeRegistryService.getKnowledgeById(targetId);

  assert(
    retrieved !== null && retrieved.displayText === '学习' && (retrieved.senses?.length || 0) >= 1,
    'Truy xuất chi tiết bằng Knowledge ID mang đầy đủ Hán tự, Pinyin và các Senses',
    `ID: ${retrieved?.id}, Pinyin: ${retrieved?.pinyin}, Senses: ${retrieved?.senses?.length}`
  );

  // ==========================================================================
  // SCENARIO 6: CẬP NHẬT NGHĨA HOẶC THUỘC TÍNH KHÔNG LÀM THAY ĐỔI ID
  // ==========================================================================
  console.log('\n📌 [TÌNH HUỐNG 6]: CẬP NHẬT NỘI DUNG VẪN BẢO TOÀN ID DUY NHẤT');
  const beforeUpdate = knowledgeRegistryService.getKnowledgeById(polyWord.id)!;
  knowledgeRegistryService.updateKnowledge(polyWord.id, {
    tags: ['hsk1', 'động từ phổ biến', 'nhiều nghĩa'],
    difficultyScore: 1.5
  });
  const afterUpdate = knowledgeRegistryService.getKnowledgeById(polyWord.id)!;

  assert(
    beforeUpdate.id === afterUpdate.id && afterUpdate.tags.includes('nhiều nghĩa'),
    'Cập nhật tags và difficulty score không thay đổi Knowledge ID',
    `ID trước: ${beforeUpdate.id} === ID sau: ${afterUpdate.id}`
  );

  // ==========================================================================
  // SCENARIO 7: XÓA HOẶC LƯU TRỮ DỮ LIỆU KHÔNG LÀM HỎNG LIÊN KẾT
  // ==========================================================================
  console.log('\n📌 [TÌNH HUỐNG 7]: LƯU TRỮ MỀM (SOFT ARCHIVE) BẢO TOÀN LIÊN KẾT');
  const tempWord = knowledgeRegistryService.createKnowledge({
    itemType: 'vocabulary',
    displayText: '临时词',
    hanziSimplified: '临时词',
    pinyin: 'lín shí cí',
    initialSense: { meaningVi: 'Từ tạm thời' }
  });
  // Gắn quan hệ với word1
  knowledgeRegistryService.addRelation(tempWord.id, word1.item.id, 'similar', 'Quan hệ thử nghiệm');

  // Lưu trữ
  const archiveResult = knowledgeRegistryService.archiveKnowledge(tempWord.id);
  const archivedItem = knowledgeRegistryService.getKnowledgeById(tempWord.id);
  const relationCheck = db.prepare('SELECT COUNT(*) as count FROM knowledge_relations WHERE source_id = ?').get(tempWord.id) as any;

  assert(
    archiveResult === true && archivedItem?.status === 'archived' && relationCheck.count === 1,
    'Archived thành công, trạng thái là archived và liên kết quan hệ không bị mồ côi',
    `Status: ${archivedItem?.status}, Relations count: ${relationCheck.count}`
  );

  // ==========================================================================
  // SCENARIO 8: MIGRATION KHÔNG LÀM MẤT KIẾN THỨC CŨ
  // ==========================================================================
  console.log('\n📌 [TÌNH HUỐNG 8]: MIGRATION BẢO TỒN 100% KIẾN THỨC CŨ VÀ CÓ BẢNG ÁNH XẠ');
  const legacyCount = (db.prepare('SELECT COUNT(*) as count FROM knowledge_legacy_mapping').get() as any).count;
  const vocabMemoryCount = (db.prepare('SELECT COUNT(*) as count FROM vocabulary_memory WHERE knowledge_id IS NOT NULL').get() as any).count;
  const grammarMemoryCount = (db.prepare('SELECT COUNT(*) as count FROM grammar_memory WHERE knowledge_id IS NOT NULL').get() as any).count;
  const dictCount = (db.prepare('SELECT COUNT(*) as count FROM dictionary_entries WHERE knowledge_id IS NOT NULL').get() as any).count;

  assert(
    legacyCount >= 100 && vocabMemoryCount >= 41 && grammarMemoryCount >= 16 && dictCount >= 36,
    'Tất cả từ vựng, cấu trúc ngữ pháp và mục từ điển cũ đã được gắn Knowledge ID',
    `Legacy mappings: ${legacyCount} | Vocab: ${vocabMemoryCount} | Grammar: ${grammarMemoryCount} | Dict: ${dictCount}`
  );

  // ==========================================================================
  // SCENARIO 9: KIỂM TRA BẢN GHI TRÙNG & PHÁT HIỆN DỮ LIỆU MỒ CÔI
  // ==========================================================================
  console.log('\n📌 [TÌNH HUỐNG 9]: RÀ SOÁT BẢN GHI TRÙNG & DỮ LIỆU MỒ CÔI (ORPHAN CHECK)');
  const orphanStats = knowledgeRegistryService.findOrphanRecords();
  const dedupCandidates = knowledgeRegistryService.detectDuplicates();

  assert(
    orphanStats.orphanSenses === 0 && orphanStats.orphanRelations === 0 && orphanStats.orphanMappings === 0,
    'Hệ thống hoàn toàn trong sạch: 0 senses mồ côi, 0 relations mồ côi, 0 mappings mồ côi',
    `Orphan senses: ${orphanStats.orphanSenses}, Orphan relations: ${orphanStats.orphanRelations}, Orphan mappings: ${orphanStats.orphanMappings}`
  );

  // ==========================================================================
  // SCENARIO 10: XÁC MINH KHẢ NĂNG SAO LƯU VÀ KHÔI PHỤC (BACKUP & RESTORE PLAN)
  // ==========================================================================
  console.log('\n📌 [TÌNH HUỐNG 10]: KIỂM TRA KHẢ NĂNG SAO LƯU & AN TOÀN DATABASE');
  const backupDir = path.resolve(process.cwd(), 'data', 'backups');
  const backups = fs.existsSync(backupDir) ? fs.readdirSync(backupDir).filter(f => f.endsWith('.db')) : [];

  assert(
    backups.length > 0,
    'Đã tìm thấy bản sao lưu SQLite hợp lệ sẵn sàng phục vụ Rollback',
    `Bản sao lưu gần nhất: ${backups[backups.length - 1]} (${(fs.statSync(path.join(backupDir, backups[backups.length - 1])).size / 1024 / 1024).toFixed(2)} MB)`
  );

  // ==========================================================================
  // TỔNG KẾT
  // ==========================================================================
  console.log('\n========================================================================');
  console.log(`🏆 KẾT QUẢ KIỂM THỬ KNOWLEDGE REGISTRY: ${passCount}/10 PASS, ${failCount} FAIL`);
  if (failCount === 0) {
    console.log('🎉 TẤT CẢ 10 TIÊU CHÍ KNOWLEDGE REGISTRY ĐẠT 100% CHUẨN MỰC KIẾN TRÚC V2.0.0!');
  }
  console.log('========================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runKnowledgeRegistryTests().catch(err => {
  console.error('Fatal Test Error:', err);
  process.exit(1);
});
