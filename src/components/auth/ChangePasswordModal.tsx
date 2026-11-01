import React, { useState } from 'react';
import { BottomSheet } from '../ui/BottomSheet';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { backendClient } from '../../utils/backendClient';

export interface ChangePasswordModalProps {
  isOpen: boolean;
  isMandatory?: boolean;
  onSuccess: () => void;
  onClose?: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  isMandatory = false,
  onSuccess,
  onClose
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Vui lòng điền đầy đủ tất cả các trường.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu mới và mật khẩu xác nhận không khớp.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Mật khẩu mới phải có ít nhất 8 ký tự.');
      return;
    }

    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

    if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      setError('Mật khẩu mới phải chứa ít nhất: 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt.');
      return;
    }

    setLoading(true);

    const res = await backendClient.changePassword({
      currentPassword,
      newPassword
    });

    setLoading(false);

    if (res.success) {
      setSuccessMsg('Đổi mật khẩu thành công!');
      setTimeout(() => {
        onSuccess();
      }, 1000);
    } else {
      setError(res.error || 'Đổi mật khẩu thất bại.');
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={() => {
        if (!isMandatory && onClose) onClose();
      }}
      title={isMandatory ? 'Bắt buộc đổi mật khẩu lần đầu' : 'Đổi mật khẩu'}
      subtitle={
        isMandatory
          ? 'Vì lý do an toàn, bạn cần cập nhật mật khẩu mới trước khi tiếp tục.'
          : 'Cập nhật mật khẩu tài khoản của bạn'
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium dark:bg-rose-950/30 dark:border-rose-900 dark:text-rose-300">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-300">
            {successMsg}
          </div>
        )}

        <Input
          label="Mật khẩu hiện tại"
          type="password"
          placeholder="Nhập mật khẩu hiện tại (VD: 123456a@B)"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />

        <Input
          label="Mật khẩu mới"
          type="password"
          placeholder="Tối thiểu 8 ký tự, gồm Hoa, Thường, Số & Ký tự đặc biệt"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          helper="Bao gồm: Chữ in hoa (A-Z), chữ thường (a-z), chữ số (0-9) và ký tự đặc biệt (!@#$...)"
        />

        <Input
          label="Xác nhận mật khẩu mới"
          type="password"
          placeholder="Nhập lại mật khẩu mới"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />

        <div className="flex gap-2.5 pt-2">
          {!isMandatory && onClose && (
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Hủy
            </Button>
          )}
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            className="flex-1"
          >
            Lưu mật khẩu mới
          </Button>
        </div>
      </form>
    </BottomSheet>
  );
};
