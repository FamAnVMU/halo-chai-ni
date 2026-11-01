import React, { useState, useEffect } from 'react';
import {
  Flame,
  Moon,
  Sun,
  Languages,
  Sparkles,
  User,
  ShieldCheck,
} from 'lucide-react';
import type { UserProfile } from '../../types';
import { db } from '../../db';
import { backendClient, AuthUser } from '../../utils/backendClient';
import { Badge } from '../ui/Badge';
import { ServerStatusBadge } from '../server/ServerStatusBadge';

interface NavbarProps {
  user: UserProfile | undefined;
  onOpenAITutor: () => void;
  onOpenProfile?: () => void;
  onOpenServerModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onOpenAITutor, onOpenProfile, onOpenServerModal }) => {
  const [authUser, setAuthUser] = useState<AuthUser | null>(backendClient.getStoredUser());

  useEffect(() => {
    backendClient.getMe().then((me) => {
      if (me) setAuthUser(me);
    });
  }, []);

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
    <header className="sticky top-0 z-30 w-full max-w-full overflow-x-hidden backdrop-blur-md bg-white/95 dark:bg-[#1A2418]/95 border-b border-[#E3EBDD] dark:border-[#2D3A2C] px-2.5 sm:px-6 pt-[calc(max(env(safe-area-inset-top,0px),16px)+6px)] pb-2 sm:pb-2.5 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-1.5 sm:gap-2 w-full">
        {/* Brand Logo & Level */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[#A3D635] text-[#263326] flex items-center justify-center font-bold text-base sm:text-xl shadow-xs font-chinese shrink-0">
            汉
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1 sm:gap-1.5">
              <span className="font-extrabold text-sm sm:text-lg tracking-tight text-[#263326] dark:text-[#EAF5D5]">
                Halo<span className="hidden xs:inline"> Chinese</span>
              </span>
              <Badge variant="lime" size="sm" className="px-1.5 py-0.5 text-[10px] sm:text-xs">
                HSK {user?.currentHskLevel || 1}
              </Badge>
            </div>
            <span className="text-[10px] text-[#647560] dark:text-[#889B84] font-medium hidden md:inline">
              Personal AI Chinese Learning
            </span>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Streak indicator */}
          <div className="flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl sm:rounded-2xl bg-[#F6FAF2] dark:bg-[#151D14] border border-[#E3EBDD] dark:border-[#2D3A2C] text-amber-600 dark:text-amber-400 text-xs font-bold shrink-0">
            <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-amber-500 text-amber-500" />
            <span>{user?.streakDays || 1}</span>
          </div>

          {/* Server Connection Status & Sync Pill */}
          <ServerStatusBadge onClick={onOpenServerModal} />

          {/* User Account / Admin Badge button */}
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl sm:rounded-2xl bg-[#F6FAF2] hover:bg-[#EAF5D5] dark:bg-[#151D14] dark:hover:bg-[#202D1D] border border-[#E3EBDD] dark:border-[#2D3A2C] text-xs font-semibold text-[#263326] dark:text-[#EAF5D5] transition-colors shrink-0"
            title="Tài khoản cá nhân"
          >
            {authUser?.role === 'admin' ? (
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <User className="w-4 h-4 text-[#647560] dark:text-[#889B84]" />
            )}
            <span className="max-w-[70px] sm:max-w-[100px] truncate hidden sm:inline">
              {authUser?.username || 'Khách'}
            </span>
          </button>

          {/* Quick AI Tutor (desktop only, since mobile has center bottom button) */}
          <button
            onClick={onOpenAITutor}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[#A3D635] text-[#263326] text-xs font-bold shadow-xs hover:brightness-105 active:scale-95 transition-all shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Tutor</span>
          </button>

          {/* Pinyin display switch */}
          <button
            onClick={togglePinyinMode}
            title="Bật/Tắt hiển thị Pinyin"
            className={`px-2 py-1 sm:px-2.5 sm:py-1.5 text-[11px] sm:text-xs font-bold rounded-xl sm:rounded-2xl border transition-colors shrink-0 ${
              user?.pinyinMode === 'above'
                ? 'bg-[#EAF5D5] dark:bg-[#202D1D] border-[#D7EDB5] dark:border-[#355A26] text-[#355A26] dark:text-[#C2E58C]'
                : 'bg-white dark:bg-[#1A2418] border-[#E3EBDD] dark:border-[#2D3A2C] text-[#647560]'
            }`}
          >
            Pinyin
          </button>

          {/* Simplified / Traditional switch */}
          <button
            onClick={toggleCharMode}
            title="Chuyển đổi Giản thể / Phồn thể"
            className="hidden md:inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-2xl border border-[#E3EBDD] dark:border-[#2D3A2C] bg-white dark:bg-[#1A2418] text-[#263326] dark:text-[#EAF5D5] hover:bg-[#F6FAF2] dark:hover:bg-[#202D1D] transition-colors shrink-0"
          >
            <Languages className="w-3.5 h-3.5 text-[#647560]" />
            <span>{user?.charMode === 'simplified' ? 'Giản' : 'Phồn'}</span>
          </button>

          {/* Dark / Light mode toggle */}
          <button
            onClick={toggleTheme}
            title="Đổi giao diện Sáng / Tối"
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center text-[#263326] dark:text-[#EAF5D5] hover:bg-[#F6FAF2] dark:hover:bg-[#202D1D] border border-[#E3EBDD] dark:border-[#2D3A2C] transition-colors shrink-0"
            aria-label="Chuyển chế độ sáng/tối"
          >
            {user?.theme === 'dark' ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#647560]" />}
          </button>
        </div>
      </div>
    </header>
  );
};
