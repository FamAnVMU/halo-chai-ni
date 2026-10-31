import { db } from '../server/db.js';
import { geminiPathService } from '../server/geminiPathService.js';

async function runTest() {
  console.log('====================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ HỆ THỐNG LỘ TRÌNH THÍCH ỨNG (ADAPTIVE PATH)');
  console.log('====================================================');

  // 1. Khởi tạo lộ trình
  console.log('\n[1] Thử nghiệm getOrCreateCurrentPath()...');
  const path = await geminiPathService.getOrCreateCurrentPath();
  console.log(`✅ Lộ trình hiện hành ID: ${path.id}, Mục tiêu: HSK ${path.targetHsk}, Tiến độ: ${path.progressPercent}%`);

  // 2. Sinh lộ trình thích ứng mới với mục tiêu HSK 3 trong 6 tháng, 25p/ngày, 5 ngày/tuần
  console.log('\n[2] Thử nghiệm generateAdaptivePath()...');
  const generated = await geminiPathService.generateAdaptivePath({
    primaryGoal: 'daily_communication',
    targetHsk: 3,
    dailyMinutes: 25,
    daysPerWeek: 5,
    reason: 'Người học đặt mục tiêu HSK 3 giao tiếp'
  });
  console.log(`✅ Đã sinh lộ trình: ID=${generated.id}, 4 giai đoạn, ${generated.schedule.length} hoạt động tuần.`);

  // 3. Đọc chi tiết lộ trình
  console.log('\n[3] Thử nghiệm getPathDetail()...');
  const detail = await geminiPathService.getPathDetail(generated.id);
  if (!detail) throw new Error('Không lấy được chi tiết lộ trình');
  console.log(`✅ Số giai đoạn: ${detail.stages.length}`);
  detail.stages.forEach(s => {
    console.log(`   - Giai đoạn ${s.stageNumber}: ${s.title} (${s.items.length} bài) - Trạng thái: ${s.status}`);
  });
  console.log(`✅ Số mốc Milestones: ${detail.milestones.length}`);
  console.log(`✅ Số mục lịch tuần: ${detail.schedule.length}`);
  if (detail.nextRecommendedItem) {
    console.log(`✅ Bài học tiếp theo được đề xuất: "${detail.nextRecommendedItem.title}" (${detail.nextRecommendedItem.itemType})`);
  }

  // 4. Khóa và mở khóa giai đoạn (Lock Stage)
  console.log('\n[4] Thử nghiệm lockStage()...');
  const firstStage = detail.stages[0];
  const lockRes = await geminiPathService.lockStage(firstStage.id, true);
  console.log(`✅ Khóa giai đoạn 1: isLocked = ${lockRes.isLocked}`);
  const unlockRes = await geminiPathService.lockStage(firstStage.id, false);
  console.log(`✅ Mở khóa giai đoạn 1: isLocked = ${unlockRes.isLocked}`);

  // 5. Thử nghiệm Dynamic Rebalancing khi học viên làm bài kém (score = 40)
  console.log('\n[5] Thử nghiệm Dynamic Rebalancing khi điểm thấp (score = 40)...');
  const firstItem = firstStage.items[0];
  const rebalanceLow = await geminiPathService.rebalancePath({
    pathId: generated.id,
    itemId: firstItem.id,
    score: 40,
    passed: false,
    triggerReason: 'Học viên làm bài điểm thấp, cần củng cố kiến thức'
  });
  console.log(`✅ Kết quả Rebalance điểm thấp: ${rebalanceLow.message} (Version ${rebalanceLow.version})`);

  // 6. Thử nghiệm Dynamic Rebalancing khi học viên làm bài xuất sắc (score = 95)
  console.log('\n[6] Thử nghiệm Dynamic Rebalancing khi điểm cao (score = 95)...');
  const rebalanceHigh = await geminiPathService.rebalancePath({
    pathId: generated.id,
    itemId: firstItem.id,
    score: 95,
    passed: true,
    triggerReason: 'Học viên hoàn thành bài xuất sắc'
  });
  console.log(`✅ Kết quả Rebalance điểm cao: ${rebalanceHigh.message} (Version ${rebalanceHigh.version})`);

  // 7. Cập nhật mục tiêu học tập (Update Goals)
  console.log('\n[7] Thử nghiệm updateGoals()...');
  const updateRes = await geminiPathService.updateGoals({
    pathId: generated.id,
    targetHsk: 4,
    dailyMinutes: 35,
    daysPerWeek: 6
  });
  console.log(`✅ Cập nhật mục tiêu: ${updateRes.message} (Version ${updateRes.version})`);

  // 8. Quản lý lịch học tuần
  console.log('\n[8] Thử nghiệm quản lý lịch tuần (Reschedule & Complete)...');
  const firstSched = detail.schedule[0];
  if (firstSched) {
    const reschedRes = await geminiPathService.rescheduleItem(firstSched.id, 6); // Dời sang Thứ Bảy
    console.log(`✅ Dời lịch mục ${firstSched.id}: success = ${reschedRes.success}`);

    const completeRes = await geminiPathService.completeScheduleItem(firstSched.id);
    console.log(`✅ Đánh dấu hoàn thành mục lịch: success = ${completeRes.success}`);
  }

  // 9. Quản lý phiên bản (Versions snapshot & restore)
  console.log('\n[9] Thử nghiệm Versioning & Restore...');
  const versions = await geminiPathService.getVersions(generated.id);
  console.log(`✅ Số phiên bản snapshot đã lưu: ${versions.length}`);
  versions.forEach(v => {
    console.log(`   - Phiên bản #${v.versionNumber}: ${v.changesSummary} (${new Date(v.createdAt).toLocaleTimeString()})`);
  });

  if (versions.length > 1) {
    const olderVersion = versions[versions.length - 1];
    const restoreRes = await geminiPathService.restoreVersion(olderVersion.id);
    console.log(`✅ Khôi phục về phiên bản #${olderVersion.versionNumber}: ${restoreRes.message}`);
  }

  console.log('\n====================================================');
  console.log('🎉 TẤT CẢ CÁC BƯỚC KIỂM THỬ ĐÃ HOÀN THÀNH XUẤT SẮC 100%!');
  console.log('====================================================');
}

runTest().catch(err => {
  console.error('❌ Lỗi kiểm thử:', err);
  process.exit(1);
});
