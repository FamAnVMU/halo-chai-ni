import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'soft' | 'highlight' | 'outline';
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  interactive = false,
  className = '',
  ...props
}) => {
  const baseClasses = 'rounded-3xl p-4 sm:p-5 transition-all';
  
  const variantClasses = {
    default: 'bg-white border border-[#E3EBDD] shadow-sm dark:bg-[#1A2418] dark:border-[#2D3A2C]',
    soft: 'bg-[#F6FAF2] border border-[#E8EFE3] dark:bg-[#151D14] dark:border-[#222E21]',
    highlight: 'bg-gradient-to-br from-[#EAF5D5] to-[#F6FAF2] border border-[#D7EDB5] dark:from-[#202D1D] dark:to-[#162015] dark:border-[#355A26]',
    outline: 'bg-transparent border border-[#E3EBDD] dark:border-[#2D3A2C]'
  }[variant];

  const interactiveClasses = interactive
    ? 'cursor-pointer active:scale-[0.99] hover:border-[#A3D635] hover:shadow-md select-none'
    : '';

  return (
    <div
      className={`${baseClasses} ${variantClasses} ${interactiveClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
