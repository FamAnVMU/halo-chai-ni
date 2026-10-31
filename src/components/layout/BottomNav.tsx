import React from 'react';
import {
  Home,
  Map,
  BotMessageSquare,
  BookOpen,
  Menu,
} from 'lucide-react';
import type { NavTab } from './Sidebar';

interface BottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenMobileMenu: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenMobileMenu,
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 flex items-center justify-around safe-bottom">
      <button
        onClick={() => onSelectTab('home')}
        className={`flex flex-col items-center py-1 px-2.5 rounded-lg text-xs font-medium transition-colors ${
          currentTab === 'home'
            ? 'text-primary-600 dark:text-primary-400 font-bold'
            : 'text-slate-500 dark:text-slate-400'
        }`}
      >
        <Home className="w-5 h-5 mb-0.5" />
        <span>Trang chủ</span>
      </button>

      <button
        onClick={() => onSelectTab('roadmap')}
        className={`flex flex-col items-center py-1 px-2.5 rounded-lg text-xs font-medium transition-colors ${
          currentTab === 'roadmap'
            ? 'text-primary-600 dark:text-primary-400 font-bold'
            : 'text-slate-500 dark:text-slate-400'
        }`}
      >
        <Map className="w-5 h-5 mb-0.5" />
        <span>Lộ trình</span>
      </button>

      {/* Floating Center AI Tutor Button */}
      <button
        onClick={() => onSelectTab('ai_tutor')}
        className="flex flex-col items-center -top-4 relative group"
      >
        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary-600 to-rose-500 text-white flex items-center justify-center shadow-lg shadow-primary-500/30 group-active:scale-95 transition-transform">
          <BotMessageSquare className="w-6 h-6" />
        </div>
        <span className="text-[10px] font-bold mt-1 text-primary-600 dark:text-primary-400">
          AI Tutor
        </span>
      </button>

      <button
        onClick={() => onSelectTab('vocab')}
        className={`flex flex-col items-center py-1 px-2.5 rounded-lg text-xs font-medium transition-colors ${
          currentTab === 'vocab'
            ? 'text-primary-600 dark:text-primary-400 font-bold'
            : 'text-slate-500 dark:text-slate-400'
        }`}
      >
        <BookOpen className="w-5 h-5 mb-0.5" />
        <span>Từ vựng</span>
      </button>

      <button
        onClick={onOpenMobileMenu}
        className="flex flex-col items-center py-1 px-2.5 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400"
      >
        <Menu className="w-5 h-5 mb-0.5" />
        <span>Thêm</span>
      </button>
    </nav>
  );
};
