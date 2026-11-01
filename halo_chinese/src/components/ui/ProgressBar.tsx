import React from 'react';

export interface ProgressBarProps {
  progress: number; // 0 to 100
  color?: string;
  height?: string;
  showLabel?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  color = 'bg-[#A3D635]',
  height = 'h-2.5',
  showLabel = false,
  className = ''
}) => {
  const clamped = Math.min(100, Math.max(0, progress));

  return (
    <div className={`w-full flex flex-col gap-1 ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center text-xs font-semibold text-[#355A26] dark:text-[#C2E58C]">
          <span>Tiến độ</span>
          <span>{Math.round(clamped)}%</span>
        </div>
      )}
      <div className={`w-full bg-[#EAF5D5] dark:bg-[#202D1D] rounded-full overflow-hidden ${height}`}>
        <div
          className={`${color} ${height} rounded-full transition-all duration-300 ease-out`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};
