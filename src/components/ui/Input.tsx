import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helper,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  id,
  ...props
}, ref) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs font-semibold text-[#355A26] dark:text-[#C2E58C]">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3.5 flex items-center pointer-events-none text-[#647560] dark:text-[#889B84]">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          ref={ref}
          disabled={disabled}
          className={`w-full min-h-[48px] h-12 rounded-2xl bg-white dark:bg-[#1A2418] border ${
            error
              ? 'border-rose-400 focus:ring-rose-400'
              : 'border-[#E3EBDD] dark:border-[#2D3A2C] focus:border-[#A3D635] focus:ring-[#A3D635]/40'
          } px-4 ${leftIcon ? 'pl-11' : ''} ${rightIcon ? 'pr-11' : ''} text-sm text-[#263326] dark:text-[#EAF5D5] placeholder:text-[#889B84] transition-all focus:outline-none focus:ring-2 disabled:opacity-50 ${className}`}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3.5 flex items-center text-[#647560] dark:text-[#889B84]">
            {rightIcon}
          </div>
        )}
      </div>
      {error && (
        <p className="text-xs text-rose-500 font-medium">{error}</p>
      )}
      {helper && !error && (
        <p className="text-xs text-[#647560] dark:text-[#889B84]">{helper}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
