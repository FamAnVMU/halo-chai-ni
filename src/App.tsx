import React, { useEffect, useState, Suspense, lazy } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { initializeDatabase } from './db/initDb';
import type { UserProfile, LessonContent } from './types';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { BottomNav } from './components/layout/BottomNav';
import { QuickDictionaryModal } from './components/dictionary/QuickDictionaryModal';
import { ServerConnectModal } from './components/server/ServerConnectModal';
import { connectionManager } from './utils/connectionManager';
import { syncEngine } from './utils/syncEngine';

// Lazy-loaded Views for high performance and code-splitting
const HomeView = lazy(() => import('./views/HomeView').then(m => ({ default: m.HomeView })));
const RoadmapView = lazy(() => import('./views/RoadmapView').then(m => ({ default: m.RoadmapView })));
const DictionaryView = lazy(() => import('./views/DictionaryView').then(m => ({ default: m.DictionaryView })));
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
const LearnHubView = lazy(() => import('./views/LearnHubView').then(m => ({ default: m.LearnHubView })));
const ReviewHubView = lazy(() => import('./views/ReviewHubView').then(m => ({ default: m.ReviewHubView })));
const ProfileView = lazy(() => import('./views/ProfileView').then(m => ({ default: m.ProfileView })));
const SyncSettingsView = lazy(() => import('./views/SyncSettingsView').then(m => ({ default: m.SyncSettingsView })));
const DataBackupView = lazy(() => import('./views/DataBackupView').then(m => ({ default: m.DataBackupView })));

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
  BookA,
  Server,
  Database,
} from 'lucide-react';

export function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('home');
  const [activeLesson, setActiveLesson] = useState<LessonContent | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [quickLookupWord, setQuickLookupWord] = useState<string | null>(null);
  const [isServerModalOpen, setIsServerModalOpen] = useState<boolean>(false);

  // Startup Connection Check: Tự động kiểm tra kết nối Server (Non-blocking)
  useEffect(() => {
    connectionManager.initiateStartupCheck().then(({ ok, state }) => {
      // Nếu server chưa được cấu hình hoặc không kết nối được và chưa chọn offline
      if (!ok && connectionManager.getMode() !== 'offline') {
        const cfg = connectionManager.getServerConfig();
        if (!cfg.isConfigured || state === 'unreachable') {
          setIsServerModalOpen(true);
        }
      }
    });
  }, []);

  // Global event listener for instant Quick Dictionary lookup from anywhere
  useEffect(() => {
    const handleQuickDict = (e: any) => {
      if (e.detail?.word) {
        setQuickLookupWord(e.detail.word);
      }
    };
    window.addEventListener('halo:quick-dict', handleQuickDict);
    (window as any).haloLookupWord = (word: string) => setQuickLookupWord(word);
    return () => {
      window.removeEventListener('halo:quick-dict', handleQuickDict);
      delete (window as any).haloLookupWord;
    };
  }, []);

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
    { id: 'dictionary', label: 'Từ điển tiếng Trung', icon: BookA },
    { id: 'vocab', label: 'Từ vựng & Flashcard SRS', icon: BookOpen },
    { id: 'grammar', label: 'Ngữ pháp HSK', icon: BookmarkCheck },
    { id: 'practice', label: 'Luyện tập tương tác (11 dạng)', icon: Dumbbell },
    { id: 'pronounce', label: 'Luyện phát âm & Phòng Lab AI', icon: Mic },
    { id: 'shadowing', label: 'Shadowing – Luyện nói nhại', icon: Headphones },
    { id: 'write', label: 'Luyện viết chữ Hán', icon: PenTool },
    { id: 'reading', label: 'Luyện đọc tương tác AI', icon: BookMarked },
    { id: 'listening', label: 'Luyện nghe hiểu', icon: Headphones },
    { id: 'ai_tutor', label: 'AI Tutor & Voice Chat', icon: BotMessageSquare },
    { id: 'ai_lessons', label: 'Bài học dành cho bạn', icon: Sparkles },
    { id: 'ai_memory', label: 'Bộ nhớ học tập', icon: Brain },
    { id: 'stats', label: 'Thống kê tiến độ', icon: BarChart3 },
    { id: 'sync_settings', label: 'Kết nối Server & Đồng bộ', icon: Server },
    { id: 'data_backup', label: 'Quản lý dữ liệu & Sao lưu', icon: Database },
    { id: 'settings', label: 'Cài đặt & Quản lý API', icon: Settings },
  ];

  return (
    <div className="min-h-[100dvh] bg-[#F6FAF2] dark:bg-[#121811] text-[#263326] dark:text-[#EAF5D5] flex flex-col font-sans transition-colors duration-150">
      {/* Top Navigation Bar */}
      <Navbar
        user={user}
        onOpenAITutor={() => handleSelectTab('ai_tutor')}
        onOpenProfile={() => handleSelectTab('profile')}
        onOpenServerModal={() => setIsServerModalOpen(true)}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Desktop Sidebar */}
        <Sidebar currentTab={currentTab} onSelectTab={handleSelectTab} />

        {/* Main Content View Container with mobile bottom-nav padding */}
        <main className="flex-1 p-3.5 sm:p-5 md:p-6 lg:p-8 min-w-0 pb-24 md:pb-8">
          <Suspense fallback={
            <div className="py-24 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-[#A3D635] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-semibold text-[#647560] dark:text-[#889B84]">Đang tải phân hệ...</span>
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
                {currentTab === 'learn' && (
                  <LearnHubView onNavigate={handleSelectTab} />
                )}
                {currentTab === 'review' && (
                  <ReviewHubView onNavigate={handleSelectTab} />
                )}
                {currentTab === 'profile' && (
                  <ProfileView user={user} onNavigate={handleSelectTab} />
                )}
                {currentTab === 'placement_test' && (
                  <PlacementTestView onNavigate={handleSelectTab} />
                )}
                {currentTab === 'roadmap' && (
                  <RoadmapView onSelectLesson={handleSelectLesson} onNavigate={handleSelectTab} />
                )}
                {currentTab === 'dictionary' && (
                  <DictionaryView onNavigate={handleSelectTab} />
                )}
                {currentTab === 'vocab' && <VocabularyView />}
                {currentTab === 'grammar' && <GrammarView />}
                {currentTab === 'practice' && <PracticeView onNavigate={handleSelectTab} />}
                {currentTab === 'pronounce' && <PronunciationView />}
                {currentTab === 'shadowing' && <ShadowingView onNavigate={handleSelectTab} />}
                {currentTab === 'write' && <HanziWritingView />}
                {currentTab === 'reading' && <ReadingView onNavigate={handleSelectTab} />}
                {currentTab === 'listening' && <ListeningView />}
                {currentTab === 'ai_tutor' && <AITutorView onNavigate={handleSelectTab} />}
                {currentTab === 'ai_lessons' && <GeneratedLessonsView />}
                {currentTab === 'ai_memory' && <LearnerMemoryView />}
                {currentTab === 'stats' && <StatsView user={user} />}
                {currentTab === 'sync_settings' && <SyncSettingsView onBack={() => handleSelectTab('home')} />}
                {currentTab === 'data_backup' && <DataBackupView onBack={() => handleSelectTab('settings')} />}
                {currentTab === 'settings' && <SettingsView user={user} onNavigate={handleSelectTab} />}
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

      {/* Mobile Drawer Menu (All Modules) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
          <div className="w-72 bg-white dark:bg-[#1A2418] h-full p-5 overflow-y-auto shadow-2xl flex flex-col justify-between border-l border-[#E3EBDD] dark:border-[#2D3A2C]">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E3EBDD] dark:border-[#2D3A2C]">
                <span className="font-bold text-sm text-[#263326] dark:text-[#EAF5D5]">
                  Tất Cả Phân Hệ
                </span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="touch-target w-8 h-8 rounded-full text-[#647560] hover:text-[#263326] dark:hover:text-[#EAF5D5]"
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
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left text-xs font-semibold transition-colors ${
                        isActive
                          ? 'bg-[#EAF5D5] text-[#355A26] dark:bg-[#202D1D] dark:text-[#C2E58C]'
                          : 'text-[#263326] dark:text-[#EAF5D5] hover:bg-[#F6FAF2] dark:hover:bg-[#151D14]'
                      }`}
                    >
                      <Icon className="w-4 h-4 text-[#647560]" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="text-[11px] text-[#647560] dark:text-[#889B84] text-center pt-4 border-t border-[#E3EBDD] dark:border-[#2D3A2C]">
              Halo Chinese v3.2.2 • Mobile-First Personal AI
            </div>
          </div>
        </div>
      )}

      {/* Global Server Connection & Offline Mode Modal */}
      <ServerConnectModal
        isOpen={isServerModalOpen}
        onClose={() => setIsServerModalOpen(false)}
        onProceedOffline={() => handleSelectTab('home')}
        onOpenSyncSettings={() => handleSelectTab('sync_settings')}
      />

      {/* Global Quick Dictionary Lookup Modal */}
      <QuickDictionaryModal
        word={quickLookupWord}
        onClose={() => setQuickLookupWord(null)}
        onNavigate={handleSelectTab}
        onOpenFullDetail={() => {
          setQuickLookupWord(null);
          setCurrentTab('dictionary');
        }}
      />
    </div>
  );
}

export default App;
