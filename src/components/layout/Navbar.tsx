import React from 'react';
import {
  Flame,
  Moon,
  Sun,
  Languages,
  Sparkles,
} from 'lucide-react';
import type { UserProfile } from '../../types';
import { db } from '../../db';

interface NavbarProps {
  user: UserProfile | undefined;
  onOpenAITutor: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onOpenAITutor }) => {
  const toggleTheme = async () => {
    if (!user) return;
    const nextTheme = user.theme === 'dark' ? 'light' : 'dark';
    await db.users.update(user.id, { theme: nextTheme });
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const toggleCharMode = async () => {
    if (!user) return;
    const nextMode = user.charMode === 'simplified' ? 'traditional' : 'simplified';
    await db.users.update(user.id, { charMode: nextMode });
  };

  const togglePinyinMode = async () => {
    if (!user) return;
    const nextPinyin = user.pinyinMode === 'above' ? 'none' : 'above';
    await db.users.update(user.id, { pinyinMode: nextPinyin });
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-600 to-rose-400 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-primary-500/20 font-chinese">
            汉
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-primary-600 to-rose-500 bg-clip-text text-transparent">
                Halo Chinese
              </span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300">
                HSK {user?.currentHskLevel || 1}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
              Học Tiếng Trung Cá Nhân & AI Tutor
            </p>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          {/* Streak indicator */}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 text-amber-600 dark:text-amber-400 text-xs font-bold">
            <Flame className="w-4 h-4 fill-amber-500 text-amber-500 animate-pulse" />
            <span>{user?.streakDays || 1} ngày</span>
          </div>

          {/* Quick Launch AI Tutor button */}
          <button
            onClick={onOpenAITutor}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-primary-600 to-rose-500 text-white text-xs font-semibold shadow hover:shadow-md hover:brightness-105 active:scale-95 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Giáo Viên AI</span>
          </button>

          {/* Pinyin display switch */}
          <button
            onClick={togglePinyinMode}
            title="Bật/Tắt hiển thị Pinyin"
            className={`px-2 py-1 text-xs font-semibold rounded-lg border transition-colors ${
              user?.pinyinMode === 'above'
                ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
            }`}
          >
            Pinyin: {user?.pinyinMode === 'above' ? 'Bật' : 'Tắt'}
          </button>

          {/* Simplified / Traditional switch */}
          <button
            onClick={toggleCharMode}
            title="Chuyển đổi Giản thể / Phồn thể"
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <Languages className="w-3.5 h-3.5" />
            <span>{user?.charMode === 'simplified' ? 'Giản thể' : 'Phồn thể'}</span>
          </button>

          {/* Dark / Light mode toggle */}
          <button
            onClick={toggleTheme}
            title="Đổi giao diện Sáng / Tối"
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
          >
            {user?.theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
