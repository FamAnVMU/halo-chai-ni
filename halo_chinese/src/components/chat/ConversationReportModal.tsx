import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Award,
  BookOpen,
  Volume2,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowRight,
  TrendingUp,
  Brain,
  Layers,
  ChevronDown,
  ChevronUp,
  Mic,
  MessageSquare,
  Compass,
  Repeat
} from 'lucide-react';
import type { ConversationAnalysisReport, VocabCategory } from '../../types';
import { audioService } from '../../utils/audio';

interface ConversationReportModalProps {
  report: ConversationAnalysisReport;
  onClose: () => void;
  onNavigate?: (tab: string) => void;
  onStartLesson?: (topic: string, lessonType: string) => void;
}

export const ConversationReportModal: React.FC<ConversationReportModalProps> = ({
  report,
  onClose,
  onNavigate,
  onStartLesson
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'sentences' | 'vocab' | 'grammar' | 'errors'>('overview');
  const [expandedSentenceIndex, setExpandedSentenceIndex] = useState<number | null>(0);
  const [selectedVocabCategory, setSelectedVocabCategory] = useState<VocabCategory>('A_mastered_used_well');

  const handleSpeak = (text: string) => {
    audioService.speak(text, { rate: 0.85 });
  };

  const isVoice = report.sessionType === 'voice';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-rose-500 via-rose-600 to-amber-500 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-bold shadow-inner">
              {isVoice ? <Mic className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-black tracking-tight">
                  Báo Cáo Phân Tích Buổi Học AI
                </h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/25 text-white uppercase tracking-wider">
                  {isVoice ? 'Voice Chat' : 'Text Chat'}
                </span>
              </div>
              <p className="text-xs text-white/90">
                Đánh giá toàn diện năng lực phản xạ, từ vựng, ngữ pháp và lỗi sai
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 border-b border-gray-100 bg-gray-50/50 shrink-0 overflow-x-auto text-xs font-bold text-gray-500 scrollbar-none">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3.5 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-rose-500 text-rose-600 bg-white shadow-sm rounded-t-xl'
                : 'border-transparent hover:text-gray-900'
            }`}
          >
            <Award className="w-4 h-4" />
            Tổng quan ({report.overallScore}đ)
          </button>

          <button
            onClick={() => setActiveTab('sentences')}
            className={`py-3.5 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'sentences'
                ? 'border-rose-500 text-rose-600 bg-white shadow-sm rounded-t-xl'
                : 'border-transparent hover:text-gray-900'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Chi tiết từng câu ({report.sentenceBreakdown?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('vocab')}
            className={`py-3.5 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'vocab'
                ? 'border-rose-500 text-rose-600 bg-white shadow-sm rounded-t-xl'
                : 'border-transparent hover:text-gray-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            Từ vựng 4 Nhóm
          </button>

          <button
            onClick={() => setActiveTab('grammar')}
            className={`py-3.5 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'grammar'
                ? 'border-rose-500 text-rose-600 bg-white shadow-sm rounded-t-xl'
                : 'border-transparent hover:text-gray-900'
            }`}
          >
            <Compass className="w-4 h-4" />
            Ngữ pháp ({report.grammarAnalysis?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('errors')}
            className={`py-3.5 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'errors'
                ? 'border-rose-500 text-rose-600 bg-white shadow-sm rounded-t-xl'
                : 'border-transparent hover:text-gray-900'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Sổ tay lỗi sai ({report.detectedErrors?.length || 0})
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* ================= TAB 1: OVERVIEW ================= */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Summary Hero Card */}
              <div className="p-5 bg-gradient-to-br from-rose-50 to-orange-50 rounded-3xl border border-rose-100/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    Tóm Tắt Phiên Học
                  </span>
                  <div className="text-xs font-bold text-gray-500">
                    {new Date(report.createdAt).toLocaleDateString('vi-VN')}
                  </div>
                </div>
                <p className="text-sm md:text-base font-semibold text-gray-900 leading-relaxed">
                  {report.summaryVi}
                </p>

                {/* Topics tags */}
                {report.topics?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {report.topics.map((t, idx) => (
                      <span
                        key={idx}
                        className="text-xs font-bold px-3 py-1 rounded-full bg-white text-rose-700 border border-rose-200/60 shadow-xs"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 4 Core Competency Scores */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center">
                  <span className="text-xs font-semibold text-gray-500 block mb-1">Điểm Tổng Thể</span>
                  <span className="text-3xl font-black text-rose-600">{report.overallScore}</span>
                  <span className="text-[10px] text-gray-400 block mt-0.5">/ 100 điểm</span>
                </div>

                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center">
                  <span className="text-xs font-semibold text-gray-500 block mb-1">Khả Năng Hiểu</span>
                  <span className="text-3xl font-black text-emerald-600">
                    {report.communicationAssessment?.comprehensionScore || 85}%
                  </span>
                  <span className="text-[10px] text-gray-400 block mt-0.5">Bắt kịp ngữ cảnh</span>
                </div>

                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center">
                  <span className="text-xs font-semibold text-gray-500 block mb-1">Tốc Độ Phản Hồi</span>
                  <span className="text-3xl font-black text-blue-600">
                    {report.communicationAssessment?.responsivenessScore || 80}%
                  </span>
                  <span className="text-[10px] text-gray-400 block mt-0.5">Phản xạ tự nhiên</span>
                </div>

                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center">
                  <span className="text-xs font-semibold text-gray-500 block mb-1">Độ Phức Tạp Câu</span>
                  <span className="text-3xl font-black text-purple-600">
                    {report.communicationAssessment?.sentenceComplexityScore || 75}%
                  </span>
                  <span className="text-[10px] text-gray-400 block mt-0.5">Vận dụng cấu trúc</span>
                </div>
              </div>

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 bg-emerald-50/70 border border-emerald-100 rounded-3xl space-y-2">
                  <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Điểm Mạnh Cần Phát Huy
                  </h4>
                  <ul className="text-xs text-emerald-950 space-y-1.5 list-disc pl-4">
                    {report.communicationAssessment?.strengths?.map((s, i) => (
                      <li key={i} className="font-medium">{s}</li>
                    )) || <li>Tích cực nói và tương tác tự tin.</li>}
                  </ul>
                </div>

                <div className="p-5 bg-amber-50/70 border border-amber-100 rounded-3xl space-y-2">
                  <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Điểm Cần Chú Ý Cải Thiện
                  </h4>
                  <ul className="text-xs text-amber-950 space-y-1.5 list-disc pl-4">
                    {report.communicationAssessment?.weaknesses?.map((w, i) => (
                      <li key={i} className="font-medium">{w}</li>
                    )) || <li>Cần luyện thêm ngữ điệu và trật tự từ.</li>}
                  </ul>
                </div>
              </div>

              {/* Reflex & Active Use Feedback */}
              {report.communicationAssessment?.reflexAndActiveUseFeedback && (
                <div className="p-4 bg-purple-50/70 border border-purple-100 rounded-2xl space-y-1">
                  <span className="text-xs font-bold text-purple-800 block">
                    Đánh giá khả năng phản xạ & vận dụng chủ động:
                  </span>
                  <p className="text-xs text-purple-950 leading-relaxed font-medium">
                    {report.communicationAssessment.reflexAndActiveUseFeedback}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 2: SENTENCE BREAKDOWN ================= */}
          {activeTab === 'sentences' && (
            <div className="space-y-3 animate-fadeIn">
              <p className="text-xs text-gray-500 font-semibold mb-2">
                Bấm vào từng câu bạn đã nói trong buổi học để xem phân tích và câu sửa chuẩn từ AI:
              </p>

              {report.sentenceBreakdown?.length > 0 ? (
                report.sentenceBreakdown.map((item, idx) => {
                  const isExpanded = expandedSentenceIndex === idx;
                  return (
                    <div
                      key={idx}
                      className={`rounded-2xl border transition-all overflow-hidden ${
                        item.isCorrect
                          ? 'border-gray-100 bg-white shadow-xs'
                          : 'border-red-200 bg-red-50/20 shadow-xs'
                      }`}
                    >
                      <div
                        onClick={() => setExpandedSentenceIndex(isExpanded ? null : idx)}
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50/70 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              item.isCorrect
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <div>
                            <p className="font-bold text-sm text-gray-900 font-sans">
                              {item.userSentenceZh}
                            </p>
                            {item.userSentenceVi && (
                              <p className="text-xs text-gray-500 italic">{item.userSentenceVi}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSpeak(item.userSentenceZh);
                            }}
                            className="p-1 text-gray-400 hover:text-rose-600 transition-colors"
                            title="Nghe câu này"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                      </div>

                      {/* Expanded Critique */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-2 border-t border-gray-100/80 bg-gray-50/60 space-y-2 text-xs">
                          {item.userSentencePinyin && (
                            <p className="text-rose-600 font-medium">Pinyin: {item.userSentencePinyin}</p>
                          )}

                          <div className="p-3 bg-white rounded-xl border border-gray-200/70 space-y-1">
                            <span className="font-bold text-gray-700 block">💡 Nhận xét của AI:</span>
                            <p className="text-gray-800 font-medium">{item.aiCritiqueVi}</p>
                          </div>

                          {item.correctedSentenceZh && !item.isCorrect && (
                            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                              <div>
                                <span className="font-bold text-emerald-800 block">
                                  ✨ Câu sửa đúng chuẩn:
                                </span>
                                <p className="font-bold text-sm text-emerald-950 font-sans">
                                  {item.correctedSentenceZh}
                                </p>
                              </div>
                              <button
                                onClick={() => handleSpeak(item.correctedSentenceZh || '')}
                                className="text-emerald-700 hover:text-emerald-900 p-1"
                              >
                                <Volume2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs text-gray-400">
                  Chưa có dữ liệu phân tích từng câu cho phiên này.
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 3: VOCABULARY 4 GROUPS ================= */}
          {activeTab === 'vocab' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { id: 'A_mastered_used_well' as VocabCategory, label: '🟢 Nhóm A: Dùng Tốt', count: report.vocabAnalysis?.groupA?.length || 0, desc: 'Chủ động & chính xác' },
                  { id: 'B_known_used_inaccurately' as VocabCategory, label: '🟡 Nhóm B: Chưa Chuẩn', count: report.vocabAnalysis?.groupB?.length || 0, desc: 'Sai ngữ cảnh/gần nghĩa' },
                  { id: 'C_newly_exposed' as VocabCategory, label: '🔵 Nhóm C: Từ Mới', count: report.vocabAnalysis?.groupC?.length || 0, desc: 'Mới tiếp xúc/AI dạy' },
                  { id: 'D_needs_review' as VocabCategory, label: '🔴 Nhóm D: Cần Ôn', count: report.vocabAnalysis?.groupD?.length || 0, desc: 'Quên hoặc lúng túng' },
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedVocabCategory(cat.id)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      selectedVocabCategory === cat.id
                        ? 'border-rose-500 bg-rose-50/40 shadow-xs ring-1 ring-rose-500'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <span className="font-bold text-xs text-gray-900 block">{cat.label}</span>
                    <span className="text-lg font-black text-rose-600">{cat.count} từ</span>
                    <span className="text-[10px] text-gray-400 block">{cat.desc}</span>
                  </button>
                ))}
              </div>

              {/* Vocab Cards List */}
              <div className="space-y-2 pt-2">
                {(() => {
                  const list =
                    selectedVocabCategory === 'A_mastered_used_well'
                      ? report.vocabAnalysis?.groupA
                      : selectedVocabCategory === 'B_known_used_inaccurately'
                      ? report.vocabAnalysis?.groupB
                      : selectedVocabCategory === 'C_newly_exposed'
                      ? report.vocabAnalysis?.groupC
                      : report.vocabAnalysis?.groupD;

                  if (!list || list.length === 0) {
                    return (
                      <div className="p-8 text-center bg-gray-50 rounded-2xl text-xs text-gray-400">
                        Không có từ vựng nào thuộc nhóm này trong buổi học vừa rồi.
                      </div>
                    );
                  }

                  return list.map((v, i) => (
                    <div
                      key={i}
                      className="p-3.5 bg-white rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-base text-gray-900 font-sans">
                            {v.simplified}
                          </span>
                          <span className="text-xs font-semibold text-rose-600">{v.pinyin}</span>
                          <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-medium">
                            {v.roleInSentence || 'từ vựng'}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-gray-700 mt-0.5">{v.meaningVi}</p>
                        {v.contextSnippet && (
                          <p className="text-[11px] text-gray-400 italic mt-0.5">
                            "{v.contextSnippet}"
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => handleSpeak(v.simplified)}
                        className="p-2 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

          {/* ================= TAB 4: GRAMMAR ================= */}
          {activeTab === 'grammar' && (
            <div className="space-y-3 animate-fadeIn">
              {report.grammarAnalysis?.length > 0 ? (
                report.grammarAnalysis.map((g, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm text-gray-900">{g.patternName}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          g.isCorrect
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {g.isCorrect ? '✓ Dùng Đúng' : '⚠ Cần Sửa'}
                      </span>
                    </div>

                    <p className="text-xs font-mono text-purple-700 bg-purple-50 p-2 rounded-xl border border-purple-100">
                      Công thức: {g.formula}
                    </p>

                    <p className="text-xs text-gray-700 font-medium">
                      💡 {g.explanationVi}
                    </p>

                    {g.userUsage && (
                      <div className="text-xs bg-gray-50 p-2.5 rounded-xl border border-gray-100 space-y-1">
                        <p className="text-gray-500">
                          Học viên đã nói: <span className="font-semibold text-gray-800">"{g.userUsage}"</span>
                        </p>
                        {g.correction && !g.isCorrect && (
                          <p className="text-emerald-700 font-semibold">
                            Gợi ý sửa: "{g.correction}"
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-gray-400">
                  Không ghi nhận cấu trúc ngữ pháp đặc biệt nào trong phiên này.
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 5: DETECTED ERRORS ================= */}
          {activeTab === 'errors' && (
            <div className="space-y-3 animate-fadeIn">
              {report.detectedErrors?.length > 0 ? (
                report.detectedErrors.map((err, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-red-50/40 rounded-2xl border border-red-200 shadow-xs space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-red-800 uppercase tracking-wider flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                        {err.title}
                      </span>
                      <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-md">
                        {err.errorType}
                      </span>
                    </div>

                    <div className="text-xs space-y-1">
                      <p className="text-red-900 font-medium">
                        Câu bạn nói: <span className="font-bold line-through">"{err.userSentence}"</span>
                      </p>
                      <p className="text-emerald-800 font-bold">
                        Câu sửa đúng: <span>"{err.correctedSentence}"</span>
                      </p>
                    </div>

                    <p className="text-xs text-gray-700 bg-white p-2.5 rounded-xl border border-red-100">
                      💡 {err.explanationVi}
                    </p>

                    {err.similarExample && (
                      <p className="text-[11px] text-gray-500 italic">
                        Ví dụ mở rộng: {err.similarExample}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-emerald-600 font-bold bg-emerald-50 rounded-2xl border border-emerald-100">
                  🎉 Tuyệt vời! Bạn không mắc lỗi sai đáng chú ý nào trong buổi học này!
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions (Section 11.4) */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {report.suggestedLesson && onStartLesson && (
              <button
                onClick={() => {
                  onStartLesson(
                    report.suggestedLesson?.topic || '',
                    report.suggestedLesson?.lessonType || 'reinforce'
                  );
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <BookOpen className="w-3.5 h-3.5" />
                Học bài gợi ý: {report.suggestedLesson.topic}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onNavigate && (
              <button
                onClick={() => {
                  onNavigate('practice');
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <Repeat className="w-3.5 h-3.5" />
                Ôn tập ngay (SRS)
              </button>
            )}

            {onNavigate && (
              <button
                onClick={() => {
                  onNavigate('ai_memory');
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs flex items-center gap-1.5 transition-all"
              >
                <Brain className="w-3.5 h-3.5" />
                Xem Bộ Nhớ
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold text-xs"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
