import React from 'react';
import {
  Home,
  Map,
  BookOpen,
  BookmarkCheck,
  Dumbbell,
  Mic,
  PenTool,
  BookMarked,
  Headphones,
  BotMessageSquare,
  BarChart3,
  Settings,
  Sparkles,
  Brain,
} from 'lucide-react';

export type NavTab =
  | 'home'
  | 'roadmap'
  | 'vocab'
  | 'grammar'
  | 'practice'
  | 'pronounce'
  | 'write'
  | 'reading'
  | 'listening'
  | 'ai_tutor'
  | 'ai_lessons'
  | 'ai_memory'
  | 'stats'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const navItems: Array<{
    id: NavTab;
    label: string;
    subLabel: string;
    icon: React.ComponentType<{ className?: string }>;
    highlight?: boolean;
  }> = [
    { id: 'home', label: 'Trang chủ', subLabel: 'Tổng quan', icon: Home },
    { id: 'roadmap', label: 'Lộ trình học', subLabel: 'HSK 1 - 6', icon: Map },
    { id: 'vocab', label: 'Từ vựng & SRS', subLabel: 'Ghi nhớ lặp lại', icon: BookOpen },
    { id: 'grammar', label: 'Ngữ pháp', subLabel: 'Cấu trúc & Lỗi sai', icon: BookmarkCheck },
    { id: 'practice', label: 'Luyện tập', subLabel: '11 dạng tương tác', icon: Dumbbell },
    { id: 'pronounce', label: 'Luyện phát âm', subLabel: 'Pinyin & Chấm điểm', icon: Mic },
    { id: 'write', label: 'Luyện viết', subLabel: 'Thứ tự nét bút', icon: PenTool },
    { id: 'reading', label: 'Đọc hiểu', subLabel: 'Truyện phân cấp', icon: BookMarked },
    { id: 'listening', label: 'Nghe hiểu', subLabel: 'Luyện nghe HSK', icon: Headphones },
    {
      id: 'ai_tutor',
      label: 'AI Tutor',
      subLabel: 'Voice & Text Chat',
      icon: BotMessageSquare,
      highlight: true,
    },
    {
      id: 'ai_lessons',
      label: 'Bài học dành cho bạn',
      subLabel: 'AI tạo cá nhân hóa',
      icon: Sparkles,
      highlight: true,
    },
    {
      id: 'ai_memory',
      label: 'Bộ nhớ học tập',
      subLabel: 'Quản lý kiến thức đã dạy',
      icon: Brain,
    },
    { id: 'stats', label: 'Thống kê', subLabel: 'Tiến độ học tập', icon: BarChart3 },
    { id: 'settings', label: 'Cài đặt', subLabel: 'API & Dữ liệu', icon: Settings },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-[calc(100vh-61px)] sticky top-[61px] p-3 overflow-y-auto">
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 py-1 mb-1">
        Phân Hệ Học Tập
      </div>
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all ${
                isActive
                  ? item.highlight
                    ? 'bg-gradient-to-r from-primary-600 to-rose-500 text-white shadow-md shadow-primary-500/25 font-semibold'
                    : 'bg-primary-50 dark:bg-primary-950/70 text-primary-700 dark:text-primary-300 font-semibold border-l-4 border-primary-600'
                  : item.highlight
                  ? 'bg-gradient-to-r from-primary-50 to-rose-50 dark:from-primary-950/40 dark:to-rose-950/40 text-primary-700 dark:text-primary-300 hover:from-primary-100 hover:to-rose-100 font-medium'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 font-medium'
              }`}
            >
              <div
                className={`p-1.5 rounded-lg ${
                  isActive && item.highlight
                    ? 'bg-white/20'
                    : isActive
                    ? 'bg-primary-100 dark:bg-primary-900/60 text-primary-600 dark:text-primary-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate leading-tight flex items-center justify-between">
                  <span>{item.label}</span>
                  {item.highlight && (
                    <span className="text-[9px] uppercase tracking-wide font-extrabold px-1.5 py-0.2 rounded bg-amber-400 text-slate-900 ml-1">
                      AI 2-Way
                    </span>
                  )}
                </div>
                <div
                  className={`text-[11px] truncate ${
                    isActive && item.highlight
                      ? 'text-white/80'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {item.subLabel}
                </div>
              </div>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
