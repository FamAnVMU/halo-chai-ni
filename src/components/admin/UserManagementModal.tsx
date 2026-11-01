import React, { useState, useEffect } from 'react';
import { BottomSheet } from '../ui/BottomSheet';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { backendClient, LanInfoResponse } from '../../utils/backendClient';

export interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'lan'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [lanInfo, setLanInfo] = useState<LanInfoResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [lanToggling, setLanToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New user form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');

  // Reset password state
  const [resetTargetId, setResetTargetId] = useState<string | null>(null);
  const [resetPasswordVal, setResetPasswordVal] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, lanRes] = await Promise.all([
        backendClient.getAdminUsers(),
        backendClient.getLanInfo()
      ]);

      if (usersRes.success && usersRes.users) {
        setUsers(usersRes.users);
      }
      if (lanRes) {
        setLanInfo(lanRes);
      }
    } catch (e: any) {
      setError(e.message || 'Không thể tải dữ liệu quản trị');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const handleCreateLearner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword) return;

    setError(null);
    setSuccess(null);
    const res = await backendClient.createLearner({
      username: newUsername.trim(),
      password: newPassword,
      name: newDisplayName.trim() || undefined
    });

    if (res.success) {
      setSuccess(`Tạo tài khoản ${newUsername} thành công!`);
      setNewUsername('');
      setNewPassword('');
      setNewDisplayName('');
      setShowCreateForm(false);
      loadData();
    } else {
      setError(res.error || 'Tạo tài khoản thất bại');
    }
  };

  const handleToggleStatus = async (user: any) => {
    if (user.role === 'admin') {
      alert('Không thể khóa tài khoản quản trị viên tối cao.');
      return;
    }
    const nextStatus = user.status === 'active' ? 'disabled' : 'active';
    const confirm = window.confirm(`Bạn có chắc muốn chuyển trạng thái tài khoản ${user.username} thành "${nextStatus}"?`);
    if (!confirm) return;

    const res = await backendClient.setUserStatus(user.id, nextStatus);
    if (res.success) {
      loadData();
    } else {
      alert(res.error || 'Thao tác thất bại');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetId || !resetPasswordVal) return;

    const res = await backendClient.resetUserPassword(resetTargetId, resetPasswordVal);
    if (res.success) {
      setSuccess('Đặt lại mật khẩu thành công!');
      setResetTargetId(null);
      setResetPasswordVal('');
    } else {
      setError(res.error || 'Đặt lại mật khẩu thất bại');
    }
  };

  const handleToggleLan = async () => {
    if (!lanInfo) return;
    const nextState = !lanInfo.lanAccessEnabled;

    if (nextState) {
      const confirm = window.confirm(
        '⚠️ CẢNH BÁO BẢO MẬT:\n\nBật tính năng này sẽ cho phép các thiết bị khác (điện thoại, máy tính bảng) trong cùng mạng Wi-Fi truy cập vào hệ thống Halo Chinese trên máy tính này.\n\nChỉ bật khi bạn đang ở trong mạng Wi-Fi riêng tư tin cậy (nhà riêng). Bạn có muốn tiếp tục?'
      );
      if (!confirm) return;
    }

    setLanToggling(true);
    const res = await backendClient.toggleLan(nextState);
    setLanToggling(false);

    if (res.success) {
      setLanInfo(prev => prev ? { ...prev, lanAccessEnabled: res.lanAccessEnabled } : null);
      setSuccess(res.lanAccessEnabled ? 'Đã bật chế độ kết nối mạng LAN' : 'Đã tắt kết nối mạng LAN (Bảo vệ Localhost)');
    } else {
      setError(res.error || 'Không thể thay đổi cài đặt LAN');
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Bảng điều khiển Quản trị (Admin Panel)"
      subtitle="Quản lý tài khoản học viên và cài đặt kết nối an toàn"
      maxHeight="max-h-[90dvh]"
    >
      <div className="flex flex-col gap-4">
        {/* Navigation Tabs */}
        <div className="flex p-1 bg-[#F6FAF2] dark:bg-[#151D14] rounded-2xl border border-[#E3EBDD] dark:border-[#2D3A2C]">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'users'
                ? 'bg-white dark:bg-[#1A2418] text-[#263326] dark:text-[#EAF5D5] shadow-xs'
                : 'text-[#647560] dark:text-[#889B84]'
            }`}
          >
            👥 Tài khoản học viên ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('lan')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'lan'
                ? 'bg-white dark:bg-[#1A2418] text-[#263326] dark:text-[#EAF5D5] shadow-xs'
                : 'text-[#647560] dark:text-[#889B84]'
            }`}
          >
            📡 Kết nối LAN & Thiết bị ({lanInfo?.lanAccessEnabled ? 'Bật' : 'Tắt'})
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
            {success}
          </div>
        )}

        {/* TAB 1: USERS */}
        {activeTab === 'users' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#355A26] dark:text-[#C2E58C]">
                Danh sách người dùng
              </span>
              <Button
                size="sm"
                variant={showCreateForm ? 'outline' : 'primary'}
                onClick={() => setShowCreateForm(!showCreateForm)}
              >
                {showCreateForm ? 'Đóng form' : '+ Tạo học viên mới'}
              </Button>
            </div>

            {/* Create Form */}
            {showCreateForm && (
              <form onSubmit={handleCreateLearner} className="p-4 rounded-2xl bg-[#F6FAF2] dark:bg-[#151D14] border border-[#E3EBDD] dark:border-[#2D3A2C] flex flex-col gap-3">
                <span className="text-xs font-bold text-[#263326] dark:text-[#EAF5D5]">
                  Thêm tài khoản học viên mới
                </span>
                <Input
                  label="Tên đăng nhập"
                  placeholder="VD: learner_lan"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  required
                />
                <Input
                  label="Mật khẩu"
                  type="password"
                  placeholder="Tối thiểu 8 ký tự..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <Input
                  label="Tên hiển thị (tùy chọn)"
                  placeholder="VD: Nguyễn Lan"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                />
                <Button type="submit" variant="primary" size="md" className="mt-1">
                  Xác nhận tạo học viên
                </Button>
              </form>
            )}

            {/* Reset Password Mini Form */}
            {resetTargetId && (
              <form onSubmit={handleResetPassword} className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 flex flex-col gap-3">
                <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                  Đặt lại mật khẩu cho tài khoản
                </span>
                <Input
                  label="Mật khẩu mới"
                  type="password"
                  placeholder="Nhập mật khẩu mới..."
                  value={resetPasswordVal}
                  onChange={(e) => setResetPasswordVal(e.target.value)}
                  required
                />
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setResetTargetId(null)}>
                    Hủy
                  </Button>
                  <Button type="submit" variant="primary" size="sm">
                    Lưu mật khẩu
                  </Button>
                </div>
              </form>
            )}

            {/* Users List */}
            <div className="flex flex-col gap-2.5">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="p-3.5 rounded-2xl bg-white dark:bg-[#1A2418] border border-[#E3EBDD] dark:border-[#2D3A2C] flex items-center justify-between"
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#263326] dark:text-[#EAF5D5]">
                        {u.username}
                      </span>
                      <Badge variant={u.role === 'admin' ? 'lime' : 'neutral'} size="sm">
                        {u.role === 'admin' ? 'Quản trị' : 'Học viên'}
                      </Badge>
                      <Badge variant={u.status === 'active' ? 'success' : 'danger'} size="sm">
                        {u.status === 'active' ? 'Hoạt động' : 'Đã khóa'}
                      </Badge>
                    </div>
                    {u.displayName && (
                      <span className="text-xs text-[#647560] dark:text-[#889B84] mt-0.5">
                        {u.displayName}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {u.role !== 'admin' && (
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className="text-xs font-medium px-2.5 py-1.5 rounded-xl border border-[#E3EBDD] hover:bg-[#F6FAF2] dark:border-[#2D3A2C] dark:hover:bg-[#202D1D]"
                      >
                        {u.status === 'active' ? 'Khóa' : 'Mở'}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setResetTargetId(u.id);
                        setResetPasswordVal('');
                      }}
                      className="text-xs font-medium px-2.5 py-1.5 rounded-xl border border-[#E3EBDD] hover:bg-[#F6FAF2] dark:border-[#2D3A2C] dark:hover:bg-[#202D1D]"
                    >
                      Reset pass
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: LAN ACCESS */}
        {activeTab === 'lan' && (
          <div className="flex flex-col gap-4">
            <Card variant="soft" className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-[#263326] dark:text-[#EAF5D5]">
                    Chế độ truy cập mạng cục bộ (LAN Access)
                  </h4>
                  <p className="text-xs text-[#647560] dark:text-[#889B84] mt-0.5">
                    Cho phép điện thoại cùng kết nối Wi-Fi truy cập backend
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={lanInfo?.lanAccessEnabled ? 'primary' : 'outline'}
                  loading={lanToggling}
                  onClick={handleToggleLan}
                >
                  {lanInfo?.lanAccessEnabled ? 'ĐANG BẬT (ON)' : 'ĐANG TẮT (OFF)'}
                </Button>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300">
                ⚠️ <span className="font-bold">Lưu ý an toàn:</span> Khi BẬT, máy chủ sẽ chấp nhận các kết nối mạng LAN. Khi TẮT, chỉ có máy tính này (`localhost`) mới có quyền kết nối.
              </div>
            </Card>

            {lanInfo?.lanAccessEnabled && (
              <div className="flex flex-col gap-3">
                <span className="text-xs font-bold text-[#355A26] dark:text-[#C2E58C]">
                  📱 Địa chỉ kết nối từ điện thoại:
                </span>
                <div className="flex flex-col gap-2">
                  {lanInfo.localIps.map((ip) => (
                    <div
                      key={ip}
                      className="p-3 rounded-2xl bg-white dark:bg-[#1A2418] border border-[#E3EBDD] dark:border-[#2D3A2C] flex items-center justify-between"
                    >
                      <div className="flex flex-col">
                        <span className="text-xs text-[#647560] dark:text-[#889B84]">IP Mạng Wi-Fi:</span>
                        <code className="text-sm font-mono font-bold text-[#355A26] dark:text-[#C2E58C]">
                          http://{ip}:{lanInfo.port}
                        </code>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          navigator.clipboard.writeText(`http://${ip}:${lanInfo.port}`);
                          alert(`Đã sao chép: http://${ip}:${lanInfo.port}`);
                        }}
                      >
                        Sao chép
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="p-3.5 rounded-2xl bg-[#F6FAF2] dark:bg-[#151D14] border border-[#E3EBDD] dark:border-[#2D3A2C] text-xs text-[#647560] dark:text-[#889B84] flex flex-col gap-1.5">
                  <span className="font-bold text-[#263326] dark:text-[#EAF5D5]">
                    Hướng dẫn kết nối trên điện thoại:
                  </span>
                  <p>1. Kết nối điện thoại vào cùng mạng Wi-Fi với máy tính.</p>
                  <p>2. Mở ứng dụng Halo Chinese trên điện thoại hoặc mở trình duyệt Chrome/Safari.</p>
                  <p>3. Trong mục Cài đặt kết nối, nhập địa chỉ IP ở trên.</p>
                  <p>4. Đăng nhập bằng tài khoản của bạn để đồng bộ toàn bộ bài học và trò chuyện trực tiếp với AI Tutor.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </BottomSheet>
  );
};
