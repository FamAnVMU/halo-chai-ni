import React, { useEffect, useState, Suspense, lazy } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { initializeDatabase } from './db/initDb';
import type { UserProfile, LessonContent } from './types';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { BottomNav } from './components/layout/BottomNav';

// Lazy-loaded Views for high performance and code-splitting
const HomeView = lazy(() => import('./views/HomeView').then(m => ({ default: m.HomeView })));
const RoadmapView = lazy(() => import('./views/RoadmapView').then(m => ({ default: m.RoadmapView })));
const LessonDetailView = lazy(() => import('./views/LessonDetailView').then(m => ({ default: m.LessonDetailView })));
const VocabularyView = lazy(() => import('./views/VocabularyView').then(m => ({ default: m.VocabularyView })));
const GrammarView = lazy(() => import('./views/GrammarView').then(m => ({ default: m.GrammarView })));
const PracticeView = lazy(() => import('./views/PracticeView').then(m => ({ default: m.PracticeView })));
const PronunciationView = lazy(() => import('./views/PronunciationView').then(m => ({ default: m.PronunciationView })));
const ShadowingView = lazy(() => import('./views/ShadowingView').then(m => ({ default: m.ShadowingView })));
const HanziWritingView = lazy(() => import('./views/HanziWritingView').then(m => ({ default: m.HanziWritingView })));
const ReadingView = lazy(() => import('./views/ReadingView').then(m => ({ default: m.ReadingView })));
const ListeningView = lazy(() => import('./views/ListeningView').then(m => ({ default: m.ListeningView })));
const AITutorView = lazy(() => import('./views/AITutorView').then(m => ({ default: m.AITutorView })));
const GeneratedLessonsView = lazy(() => import('./views/GeneratedLessonsView').then(m => ({ default: m.GeneratedLessonsView })));
const LearnerMemoryView = lazy(() => import('./views/LearnerMemoryView').then(m => ({ default: m.LearnerMemoryView })));
const PlacementTestView = lazy(() => import('./views/PlacementTestView').then(m => ({ default: m.PlacementTestView })));
const StatsView = lazy(() => import('./views/StatsView').then(m => ({ default: m.StatsView })));
const SettingsView = lazy(() => import('./views/SettingsView').then(m => ({ default: m.SettingsView })));

import {
  X,
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
} from 'lucide-react';

export function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('home');
  const [activeLesson, setActiveLesson] = useState<LessonContent | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Live user query from Dexie
  const user = useLiveQuery<UserProfile | undefined>(() => db.users.get('current_user'));

  useEffect(() => {
    initializeDatabase().then(() => {
      setIsLoaded(true);
    });
  }, []);

  // Sync theme
  useEffect(() => {
    if (user?.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [user?.theme]);

  const handleSelectTab = (tab: NavTab) => {
    setActiveLesson(null);
    setCurrentTab(tab);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectLesson = (lesson: LessonContent) => {
    setActiveLesson(lesson);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary-600 to-rose-500 text-white flex items-center justify-center font-bold text-2xl shadow-xl shadow-primary-500/30 animate-pulse font-chinese">
          汉
        </div>
        <div className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-4">
          Đang khởi tạo cơ sở dữ liệu Halo Chinese...
        </div>
      </div>
    );
  }

  const allNavItems: Array<{ id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'home', label: 'Trang chủ', icon: Home },
    { id: 'placement_test', label: 'Kiểm tra trình độ AI', icon: Award },
    { id: 'roadmap', label: 'Lộ trình học', icon: Map },
    { id: 'vocab', label: 'Từ vựng & Flashcard SRS', icon: BookOpen },
    { id: 'grammar', label: 'Ngữ pháp HSK', icon: BookmarkCheck },
    { id: 'practice', label: 'Luyện tập tương tác (11 dạng)', icon: Dumbbell },
    { id: 'pronounce', label: 'Luyện phát âm & Phòng Lab AI', icon: Mic },
    { id: 'shadowing', label: 'Shadowing – Luyện nói nhại', icon: Headphones },
    { id: 'write', label: 'Luyện viết chữ Hán', icon: PenTool },
    { id: 'reading', label: 'Thư viện đọc hiểu', icon: BookMarked },
    { id: 'listening', label: 'Luyện nghe hiểu', icon: Headphones },
    { id: 'ai_tutor', label: 'AI Tutor & Voice Chat', icon: BotMessageSquare },
    { id: 'ai_lessons', label: 'Bài học dành cho bạn', icon: Sparkles },
    { id: 'ai_memory', label: 'Bộ nhớ học tập', icon: Brain },
    { id: 'stats', label: 'Thống kê tiến độ', icon: BarChart3 },
    { id: 'settings', label: 'Cài đặt & Quản lý API', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Navigation Bar */}
      <Navbar
        user={user}
        onOpenAITutor={() => handleSelectTab('ai_tutor')}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Desktop Sidebar (12 modules) */}
        <Sidebar currentTab={currentTab} onSelectTab={handleSelectTab} />

        {/* Main Content View Container */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 min-w-0">
          <Suspense fallback={
            <div className="py-24 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-semibold text-slate-400">Đang tải phân hệ...</span>
            </div>
          }>
            {activeLesson ? (
              <LessonDetailView
                lesson={activeLesson}
                onBack={() => setActiveLesson(null)}
                onFinishLesson={() => {
                  setActiveLesson(null);
                  setCurrentTab('roadmap');
                }}
              />
            ) : (
              <>
                {currentTab === 'home' && (
                  <HomeView user={user} onNavigate={handleSelectTab} />
                )}
                {currentTab === 'placement_test' && (
                  <PlacementTestView onNavigate={handleSelectTab} />
                )}
                {currentTab === 'roadmap' && (
                  <RoadmapView onSelectLesson={handleSelectLesson} onNavigate={handleSelectTab} />
                )}
                {currentTab === 'vocab' && <VocabularyView />}
                {currentTab === 'grammar' && <GrammarView />}
                {currentTab === 'practice' && <PracticeView onNavigate={handleSelectTab} />}
                {currentTab === 'pronounce' && <PronunciationView />}
                {currentTab === 'shadowing' && <ShadowingView onNavigate={handleSelectTab} />}
                {currentTab === 'write' && <HanziWritingView />}
                {currentTab === 'reading' && <ReadingView />}
                {currentTab === 'listening' && <ListeningView />}
                {currentTab === 'ai_tutor' && <AITutorView onNavigate={handleSelectTab} />}
                {currentTab === 'ai_lessons' && <GeneratedLessonsView />}
                {currentTab === 'ai_memory' && <LearnerMemoryView />}
                {currentTab === 'stats' && <StatsView user={user} />}
                {currentTab === 'settings' && <SettingsView user={user} />}
              </>
            )}
          </Suspense>
        </main>
      </div>

      {/* Bottom Nav for Mobile Screens */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
      />

      {/* Mobile Drawer Menu (All 12 Modules) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="w-72 bg-white dark:bg-slate-900 h-full p-5 overflow-y-auto shadow-2xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                  Tất Cả Phân Hệ
                </span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col gap-1">
                {allNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectTab(item.id)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-semibold transition-colors ${
                        isActive
                          ? 'bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-400'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4 text-slate-500" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="text-[11px] text-slate-400 text-center pt-4 border-t border-slate-100 dark:border-slate-800">
              Halo Chinese v1.9.0 • Chinese Shadowing Practice & Pronunciation Lab
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
