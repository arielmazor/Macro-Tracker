import React from 'react';
import { cn } from '../utils/cn';

interface ProgressCircleProps {
  label: string;
  consumed: number;
  goal: number;
  colorClass: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ProgressCircle: React.FC<ProgressCircleProps> = ({
  label,
  consumed,
  goal,
  colorClass,
  size = 'md',
}) => {
  const percentage = Math.min((consumed / goal) * 100, 100);
  const remaining = Math.max(goal - consumed, 0);
  
  const radius = size === 'lg' ? 40 : size === 'md' ? 28 : 20;
  const strokeWidth = size === 'lg' ? 8 : size === 'md' ? 6 : 4;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const sizeClass = size === 'lg' ? 'w-32 h-32' : size === 'md' ? 'w-20 h-20' : 'w-14 h-14';

  return (
    <div className="flex flex-col items-center justify-center gap-1">
      <div className={cn("relative flex items-center justify-center", sizeClass)}>
        <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${radius * 2 + strokeWidth * 2} ${radius * 2 + strokeWidth * 2}`}>
          <circle
            className="text-gray-200"
            strokeWidth={strokeWidth}
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
          />
          <circle
            className={cn("transition-all duration-500 ease-out", colorClass)}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className={cn("font-bold text-gray-900", size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-sm' : 'text-xs')}>
            {Math.round(consumed)}
          </span>
          {size !== 'sm' && (
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">
              / {Math.round(goal)}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-center">
        <span className={cn("font-medium text-gray-700", size === 'lg' ? 'text-sm' : 'text-xs')}>{label}</span>
        <span className="text-[10px] text-gray-400">{Math.round(remaining)} left</span>
      </div>
    </div>
  );
};
