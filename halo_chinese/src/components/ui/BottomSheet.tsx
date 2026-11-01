import React, { useEffect } from 'react';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  maxHeight?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxHeight = 'max-h-[85dvh]'
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet Content */}
      <div
        className={`relative w-full sm:max-w-lg bg-white dark:bg-[#1A2418] rounded-t-3xl sm:rounded-3xl border border-[#E3EBDD] dark:border-[#2D3A2C] shadow-2xl flex flex-col z-10 ${maxHeight} overflow-hidden transform transition-all duration-200 ease-out`}
        role="dialog"
        aria-modal="true"
      >
        {/* Mobile Drag Pill */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 bg-[#D7EDB5] dark:bg-[#355A26] rounded-full" />
        </div>

        {/* Header */}
        {(title || subtitle) && (
          <div className="px-5 pt-3 pb-3 border-b border-[#E3EBDD] dark:border-[#2D3A2C] flex items-center justify-between">
            <div>
              {title && (
                <h3 className="text-base font-bold text-[#263326] dark:text-[#EAF5D5]">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-[#647560] dark:text-[#889B84] mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="touch-target w-10 h-10 rounded-full hover:bg-[#F6FAF2] dark:hover:bg-[#202D1D] text-[#647560] dark:text-[#889B84] transition-colors"
              aria-label="Đóng"
            >
              ✕
            </button>
          </div>
        )}

        {/* Body */}
        <div className="px-5 py-4 overflow-y-auto overscroll-contain flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};
