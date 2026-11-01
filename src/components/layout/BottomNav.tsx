import React from 'react';
import {
  Home,
  BookOpen,
  BotMessageSquare,
  RotateCcw,
  User,
} from 'lucide-react';
import type { NavTab } from './Sidebar';

interface BottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenMobileMenu?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
}) => {
  // Determine which of the 5 bottom nav items is active:
  const isHomeActive = currentTab === 'home';
  const isLearnActive = ['learn', 'roadmap', 'dictionary', 'vocab', 'grammar', 'pronounce', 'shadowing', 'write', 'reading', 'listening'].includes(currentTab);
  const isAiTutorActive = currentTab === 'ai_tutor';
  const isReviewActive = ['review', 'practice', 'ai_lessons', 'ai_memory'].includes(currentTab);
  const isProfileActive = ['profile', 'placement_test', 'stats', 'settings', 'sync_settings', 'data_backup'].includes(currentTab);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#1A2418]/95 backdrop-blur-md border-t border-[#E3EBDD] dark:border-[#2D3A2C] px-2 pt-1.5 pb-[calc(max(env(safe-area-inset-bottom,0px),12px)+4px)] flex items-center justify-around shadow-lg transition-colors w-full max-w-full overflow-x-hidden">
      {/* 1. Trang chủ */}
      <button
        onClick={() => onSelectTab('home')}
        className={`touch-target flex-1 flex flex-col items-center justify-center py-1 rounded-xl text-xs font-semibold transition-all select-none active:scale-95 ${
          isHomeActive
            ? 'text-[#355A26] dark:text-[#A3D635]'
            : 'text-[#647560] dark:text-[#889B84]'
        }`}
      >
        <Home className={`w-5 h-5 mb-0.5 ${isHomeActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
        <span className="text-[11px]">Trang chủ</span>
      </button>

      {/* 2. Học tập */}
      <button
        onClick={() => onSelectTab('learn')}
        className={`touch-target flex-1 flex flex-col items-center justify-center py-1 rounded-xl text-xs font-semibold transition-all select-none active:scale-95 ${
          isLearnActive
            ? 'text-[#355A26] dark:text-[#A3D635]'
            : 'text-[#647560] dark:text-[#889B84]'
        }`}
      >
        <BookOpen className={`w-5 h-5 mb-0.5 ${isLearnActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
        <span className="text-[11px]">Học tập</span>
      </button>

      {/* 3. AI Tutor Center Button (Prominent Lime Circle) */}
      <button
        onClick={() => onSelectTab('ai_tutor')}
        className="flex-1 flex flex-col items-center -top-4 relative group select-none active:scale-95 transition-transform"
        aria-label="AI Tutor"
      >
        <div className={`w-13 h-13 rounded-full flex items-center justify-center shadow-lg transition-all ${
          isAiTutorActive
            ? 'bg-[#A3D635] text-[#263326] ring-4 ring-[#EAF5D5] dark:ring-[#355A26] shadow-[#A3D635]/40'
            : 'bg-[#A3D635] text-[#263326] hover:brightness-105 shadow-[#A3D635]/30'
        }`}>
          <BotMessageSquare className="w-6 h-6 stroke-[2.2]" />
        </div>
        <span className="text-[10px] font-bold mt-1 text-[#355A26] dark:text-[#A3D635]">
          AI Tutor
        </span>
      </button>

      {/* 4. Ôn tập */}
      <button
        onClick={() => onSelectTab('review')}
        className={`touch-target flex-1 flex flex-col items-center justify-center py-1 rounded-xl text-xs font-semibold transition-all select-none active:scale-95 ${
          isReviewActive
            ? 'text-[#355A26] dark:text-[#A3D635]'
            : 'text-[#647560] dark:text-[#889B84]'
        }`}
      >
        <RotateCcw className={`w-5 h-5 mb-0.5 ${isReviewActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
        <span className="text-[11px]">Ôn tập</span>
      </button>

      {/* 5. Cá nhân */}
      <button
        onClick={() => onSelectTab('profile')}
        className={`touch-target flex-1 flex flex-col items-center justify-center py-1 rounded-xl text-xs font-semibold transition-all select-none active:scale-95 ${
          isProfileActive
            ? 'text-[#355A26] dark:text-[#A3D635]'
            : 'text-[#647560] dark:text-[#889B84]'
        }`}
      >
        <User className={`w-5 h-5 mb-0.5 ${isProfileActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
        <span className="text-[11px]">Cá nhân</span>
      </button>
    </nav>
  );
};
