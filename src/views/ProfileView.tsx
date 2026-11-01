import React, { useState, useEffect } from 'react';
import {
  Award,
  Settings,
  ShieldCheck,
  KeyRound,
  LogOut,
  LogIn,
  Flame,
  Brain,
  BarChart3,
  ChevronRight,
  Wifi,
  Sparkles,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { backendClient, AuthUser, LanInfoResponse } from '../utils/backendClient';
import { LoginModal } from '../components/auth/LoginModal';
import { ChangePasswordModal } from '../components/auth/ChangePasswordModal';
import { UserManagementModal } from '../components/admin/UserManagementModal';
import type { UserProfile } from '../types';
import type { NavTab } from '../components/layout/Sidebar';

interface ProfileViewProps {
  user: UserProfile | undefined;
  onNavigate: (tab: NavTab) => void;
  onRefreshUser?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  onNavigate,
  onRefreshUser
}) => {
  const [authUser, setAuthUser] = useState<AuthUser | null>(backendClient.getStoredUser());
  const [lanInfo, setLanInfo] = useState<LanInfoResponse | null>(null);

  // Modals state
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isChangePassOpen, setIsChangePassOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  useEffect(() => {
    checkCurrentUser();
    loadLanInfo();
  }, []);

  const checkCurrentUser = async () => {
    const me = await backendClient.getMe();
    if (me) {
      setAuthUser(me);
      if (me.mustChangePassword) {
        setMustChangePassword(true);
        setIsChangePassOpen(true);
      }
    }
  };

  const loadLanInfo = async () => {
    const info = await backendClient.getLanInfo();
    if (info) setLanInfo(info);
  };

  const handleLogout = async () => {
    const confirm = window.confirm('Bạn có chắc chắn muốn đăng xuất?');
    if (!confirm) return;
    await backendClient.logout();
    setAuthUser(null);
    if (onRefreshUser) onRefreshUser();
  };

  const handleLoginSuccess = (loggedInUser: AuthUser, mandatoryChange?: boolean) => {
    setAuthUser(loggedInUser);
    if (mandatoryChange) {
      setMustChangePassword(true);
      setIsChangePassOpen(true);
    }
    if (onRefreshUser) onRefreshUser();
  };

  return (
    <div className="flex flex-col gap-5 max-w-3xl mx-auto pb-16">
      {/* Profile Header Card */}
      <Card variant="highlight" className="p-5 sm:p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-[#A3D635] text-[#263326] flex items-center justify-center font-bold text-2xl shadow-sm font-chinese">
              {authUser?.displayName?.[0] || authUser?.username?.[0]?.toUpperCase() || '汉'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#263326] dark:text-[#EAF5D5]">
                  {authUser?.displayName || authUser?.username || 'Học viên Halo'}
                </h2>
                <Badge variant={authUser?.role === 'admin' ? 'lime' : 'neutral'} size="sm">
                  {authUser?.role === 'admin' ? 'Quản trị viên (Admin)' : 'Học viên'}
                </Badge>
              </div>
              <p className="text-xs text-[#647560] dark:text-[#889B84] mt-0.5">
                {authUser ? `@${authUser.username}` : 'Chưa đăng nhập (dùng phiên khách)'}
              </p>
            </div>
          </div>

          {authUser ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-xs"
            >
              <LogOut className="w-3.5 h-3.5 mr-1" />
              Đăng xuất
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsLoginOpen(true)}
              className="text-xs"
            >
              <LogIn className="w-3.5 h-3.5 mr-1" />
              Đăng nhập
            </Button>
          )}
        </div>

        {/* Quick Stats Pill Row */}
        <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-[#D7EDB5] dark:border-[#355A26]">
          <div className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white/70 dark:bg-[#1A2418]/60">
            <span className="text-xs text-[#647560] dark:text-[#889B84]">Trình độ</span>
            <span className="text-sm font-bold text-[#263326] dark:text-[#EAF5D5]">
              HSK {user?.currentHskLevel || 1}
            </span>
          </div>
          <div className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white/70 dark:bg-[#1A2418]/60">
            <span className="text-xs text-[#647560] dark:text-[#889B84]">Chuỗi ngày</span>
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 fill-amber-500" />
              {user?.streakDays || 1} ngày
            </span>
          </div>
          <div className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white/70 dark:bg-[#1A2418]/60">
            <span className="text-xs text-[#647560] dark:text-[#889B84]">Mục tiêu</span>
            <span className="text-sm font-bold text-[#355A26] dark:text-[#C2E58C]">
              HSK {user?.targetHskLevel || 3}
            </span>
          </div>
        </div>
      </Card>

      {/* Featured Placement Assessment Banner */}
      <Card
        interactive
        onClick={() => onNavigate('placement_test')}
        className="p-5 flex items-center justify-between border-2 border-[#A3D635]/40 hover:border-[#A3D635] bg-gradient-to-r from-white to-[#F6FAF2] dark:from-[#1A2418] dark:to-[#151D14]"
      >
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-[#A3D635] text-[#263326] shadow-xs">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#263326] dark:text-[#EAF5D5]">
                Đánh giá năng lực tiếng Trung đầu vào
              </h3>
              <Badge variant="lime" size="sm">AI Placement</Badge>
            </div>
            <p className="text-xs text-[#647560] dark:text-[#889B84] mt-0.5">
              Kiểm tra 6 kỹ năng (Từ vựng, Ngữ pháp, Đọc, Nghe, Viết, Giao tiếp Live) để xếp lớp chuẩn xác
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-[#889B84]" />
      </Card>

      {/* Admin Panel Entry (Only for Admin) */}
      {authUser?.role === 'admin' && (
        <Card
          interactive
          onClick={() => setIsAdminPanelOpen(true)}
          className="p-4.5 flex items-center justify-between bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-amber-500 text-white shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  Bảng điều khiển Quản trị (Admin Panel)
                </h3>
                <Badge variant="warning" size="sm">Dành riêng Admin</Badge>
              </div>
              <p className="text-xs text-amber-700/80 dark:text-amber-400 mt-0.5">
                Quản lý tài khoản học viên, reset mật khẩu & cấu hình kết nối mạng LAN ({lanInfo?.lanAccessEnabled ? 'LAN Đang Bật' : 'Bảo vệ Cục bộ'})
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-amber-600" />
        </Card>
      )}

      {/* Account & General Settings Group */}
      <div className="flex flex-col gap-2.5">
        <span className="text-xs font-bold text-[#355A26] dark:text-[#C2E58C] uppercase tracking-wider px-1">
          Cài đặt & Dữ liệu
        </span>

        {authUser && (
          <Card
            interactive
            onClick={() => {
              setMustChangePassword(false);
              setIsChangePassOpen(true);
            }}
            className="p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <KeyRound className="w-5 h-5 text-[#647560] dark:text-[#889B84]" />
              <div className="text-sm font-semibold text-[#263326] dark:text-[#EAF5D5]">
                Đổi mật khẩu tài khoản
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#889B84]" />
          </Card>
        )}

        <Card
          interactive
          onClick={() => onNavigate('settings')}
          className="p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-[#647560] dark:text-[#889B84]" />
            <div className="text-sm font-semibold text-[#263326] dark:text-[#EAF5D5]">
              Cài đặt API Gemini, Âm thanh & Mô hình
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#889B84]" />
        </Card>

        <Card
          interactive
          onClick={() => onNavigate('ai_memory')}
          className="p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Brain className="w-5 h-5 text-[#647560] dark:text-[#889B84]" />
            <div className="text-sm font-semibold text-[#263326] dark:text-[#EAF5D5]">
              Quản lý Bộ nhớ Học tập Toàn hệ thống
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#889B84]" />
        </Card>

        <Card
          interactive
          onClick={() => onNavigate('stats')}
          className="p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-[#647560] dark:text-[#889B84]" />
            <div className="text-sm font-semibold text-[#263326] dark:text-[#EAF5D5]">
              Thống kê học tập chi tiết
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#889B84]" />
        </Card>
      </div>

      {/* App Version Info */}
      <div className="text-center text-xs text-[#889B84] pt-4 flex flex-col gap-1">
        <span>Halo Chinese • Mobile-First Personal AI Edition</span>
        <span className="font-mono text-[11px]">Phiên bản 3.2.2 (v3.2.2)</span>
      </div>

      {/* Modals */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      <ChangePasswordModal
        isOpen={isChangePassOpen}
        isMandatory={mustChangePassword}
        onSuccess={() => {
          setIsChangePassOpen(false);
          setMustChangePassword(false);
          checkCurrentUser();
        }}
        onClose={() => setIsChangePassOpen(false)}
      />

      <UserManagementModal
        isOpen={isAdminPanelOpen}
        onClose={() => {
          setIsAdminPanelOpen(false);
          loadLanInfo();
        }}
      />
    </div>
  );
};
