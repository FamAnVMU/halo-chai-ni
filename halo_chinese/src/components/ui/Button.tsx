import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-2xl transition-all select-none active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#A3D635]/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100';

  const sizeClasses = {
    sm: 'text-xs h-10 px-3.5 gap-1.5',
    md: 'text-sm h-12 px-5 gap-2 min-h-[48px]',
    lg: 'text-base h-14 px-6 gap-2.5 min-h-[52px]',
    icon: 'h-12 w-12 min-h-[48px] min-w-[48px] p-0'
  }[size];

  const variantClasses = {
    primary: 'bg-[#A3D635] text-[#263326] font-semibold hover:bg-[#94C727] active:bg-[#86B81B] shadow-sm',
    secondary: 'bg-[#EAF5D5] text-[#355A26] font-semibold hover:bg-[#DCEDBE] dark:bg-[#202D1D] dark:text-[#C2E58C]',
    outline: 'border border-[#E3EBDD] bg-white text-[#263326] hover:bg-[#F6FAF2] dark:bg-[#1A2418] dark:border-[#2D3A2C] dark:text-[#EAF5D5]',
    ghost: 'bg-transparent text-[#263326] hover:bg-[#F6FAF2] dark:text-[#EAF5D5] dark:hover:bg-[#1A2418]',
    danger: 'bg-rose-500 text-white font-semibold hover:bg-rose-600'
  }[variant];

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${widthClass} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span>Đang xử lý...</span>
        </span>
      ) : children}
    </button>
  );
};
