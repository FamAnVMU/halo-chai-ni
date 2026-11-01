import React, { useState } from 'react';
import { BottomSheet } from '../ui/BottomSheet';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { backendClient, AuthUser } from '../../utils/backendClient';

export interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AuthUser, mustChangePassword?: boolean) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Vui lòng nhập tên đăng nhập và mật khẩu.');
      return;
    }

    setLoading(true);
    setError(null);

    const res = await backendClient.login({
      username: username.trim(),
      password
    });

    setLoading(false);

    if (res.success && res.user) {
      onLoginSuccess(res.user, res.mustChangePassword);
      onClose();
    } else {
      setError(res.error || 'Đăng nhập không thành công. Vui lòng thử lại.');
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Đăng nhập tài khoản"
      subtitle="Đăng nhập để đồng bộ tiến độ học tập và quản lý"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium dark:bg-rose-950/30 dark:border-rose-900 dark:text-rose-300">
            {error}
          </div>
        )}

        <Input
          label="Tên đăng nhập"
          placeholder="admin hoặc tên học viên"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
          required
        />

        <div className="relative">
          <Input
            label="Mật khẩu"
            type={showPassword ? 'text' : 'password'}
            placeholder="Nhập mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="touch-target w-9 h-9 text-xs font-medium text-[#647560] hover:text-[#263326] dark:hover:text-[#EAF5D5]"
                tabIndex={-1}
              >
                {showPassword ? 'Ẩn' : 'Hiện'}
              </button>
            }
          />
        </div>

        <div className="p-3 rounded-2xl bg-[#F6FAF2] border border-[#E3EBDD] text-xs text-[#647560] dark:bg-[#151D14] dark:border-[#222E21] dark:text-[#889B84]">
          💡 <span className="font-semibold text-[#355A26] dark:text-[#C2E58C]">Tài khoản mặc định:</span>{' '}
          Tên: <code className="font-mono font-bold text-[#263326] dark:text-[#EAF5D5]">admin</code> | Mật khẩu ban đầu:{' '}
          <code className="font-mono font-bold text-[#263326] dark:text-[#EAF5D5]">123456a@B</code>
        </div>

        <div className="flex gap-2.5 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="flex-1"
            disabled={loading}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            className="flex-2"
          >
            Đăng nhập
          </Button>
        </div>
      </form>
    </BottomSheet>
  );
};
