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
  Award,
  BookA,
  Server,
  Database,
} from 'lucide-react';

export type NavTab =
  | 'home'
  | 'learn'
  | 'review'
  | 'profile'
  | 'placement_test'
  | 'roadmap'
  | 'dictionary'
  | 'vocab'
  | 'grammar'
  | 'practice'
  | 'pronounce'
  | 'shadowing'
  | 'write'
  | 'reading'
  | 'listening'
  | 'ai_tutor'
  | 'ai_lessons'
  | 'ai_memory'
  | 'stats'
  | 'settings'
  | 'sync_settings'
  | 'data_backup';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const navSections: Array<{
    title: string;
    items: Array<{
      id: NavTab;
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      highlight?: boolean;
    }>;
  }> = [
    {
      title: 'TỔNG QUAN',
      items: [
        { id: 'home', label: 'Trang chủ', icon: Home },
        { id: 'placement_test', label: 'Đánh giá đầu vào', icon: Award, highlight: true },
        { id: 'roadmap', label: 'Lộ trình HSK 1-6', icon: Map },
      ]
    },
    {
      title: 'KỸ NĂNG & TRA CỨU',
      items: [
        { id: 'dictionary', label: 'Từ điển tiếng Trung', icon: BookA, highlight: true },
        { id: 'vocab', label: 'Từ vựng & SRS', icon: BookOpen },
        { id: 'grammar', label: 'Ngữ pháp HSK', icon: BookmarkCheck },
        { id: 'pronounce', label: 'Phòng Lab Phát âm', icon: Mic, highlight: true },
        { id: 'shadowing', label: 'Shadowing (Nói nhại)', icon: Headphones, highlight: true },
        { id: 'write', label: 'Luyện viết chữ Hán', icon: PenTool },
        { id: 'reading', label: 'Luyện đọc tương tác', icon: BookMarked },
        { id: 'listening', label: 'Luyện nghe hiểu', icon: Headphones },
      ]
    },
    {
      title: 'AI & ÔN TẬP',
      items: [
        { id: 'ai_tutor', label: 'AI Tutor Voice & Text', icon: BotMessageSquare, highlight: true },
        { id: 'ai_lessons', label: 'Bài học cá nhân hóa', icon: Sparkles },
        { id: 'practice', label: 'Luyện tập (11 dạng)', icon: Dumbbell },
        { id: 'ai_memory', label: 'Bộ nhớ học tập', icon: Brain },
        { id: 'stats', label: 'Thống kê tiến độ', icon: BarChart3 },
        { id: 'sync_settings', label: 'Kết nối Server & Đồng bộ', icon: Server, highlight: true },
        { id: 'data_backup', label: 'Quản lý dữ liệu & Sao lưu', icon: Database, highlight: true },
        { id: 'settings', label: 'Cài đặt & API Key', icon: Settings },
      ]
    }
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-[#E3EBDD] dark:border-[#2D3A2C] bg-white/70 dark:bg-[#1A2418]/60 backdrop-blur-xs p-3.5 gap-4 overflow-y-auto select-none min-h-[calc(100dvh-60px)]">
      {navSections.map((section) => (
        <div key={section.title} className="flex flex-col gap-1">
          <span className="text-[11px] font-bold text-[#647560] dark:text-[#889B84] px-2.5 py-1 tracking-wider">
            {section.title}
          </span>
          {section.items.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-xs font-semibold text-left transition-all ${
                  isActive
                    ? 'bg-[#EAF5D5] text-[#355A26] dark:bg-[#202D1D] dark:text-[#C2E58C] shadow-xs'
                    : 'text-[#263326] dark:text-[#EAF5D5] hover:bg-[#F6FAF2] dark:hover:bg-[#151D14]'
                }`}
              >
                <div className={`p-1.5 rounded-xl ${
                  isActive
                    ? 'bg-[#A3D635] text-[#263326]'
                    : item.highlight
                    ? 'bg-[#EAF5D5] text-[#355A26] dark:bg-[#202D1D] dark:text-[#C2E58C]'
                    : 'bg-[#F6FAF2] text-[#647560] dark:bg-[#151D14] dark:text-[#889B84]'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="truncate flex-1">{item.label}</span>
              </button>
            );
          })}
        </div>
      ))}
    </aside>
  );
};
