import React from 'react';

type LucideIcon = React.ElementType;

interface StatsCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  color?: 'teal' | 'blue' | 'orange' | 'red' | 'purple';
  subtitle?: string;
}

const colorSchemes = {
  teal: {
    bg: 'bg-gradient-to-br from-teal-400 to-teal-500',
    iconBg: 'bg-black/10',
  },
  blue: {
    bg: 'bg-gradient-to-br from-blue-400 to-blue-500',
    iconBg: 'bg-black/10',
  },
  orange: {
    bg: 'bg-gradient-to-br from-orange-400 to-orange-500',
    iconBg: 'bg-black/10',
  },
  red: {
    bg: 'bg-gradient-to-br from-red-400 to-red-500',
    iconBg: 'bg-black/10',
  },
  purple: {
    bg: 'bg-gradient-to-br from-purple-400 to-purple-500',
    iconBg: 'bg-black/10',
  },
};

export default function StatsCard({
  title,
  value,
  icon: Icon,
  color = 'blue',
  subtitle,
}: StatsCardProps) {
  const scheme = colorSchemes[color] || colorSchemes.blue;

  return (
    <div
      className={`relative overflow-hidden rounded-xl p-5 text-white shadow-lg transition-all duration-300 hover:scale-105 ${scheme.bg}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium uppercase tracking-wider opacity-80">{title}</p>
          <p className="mt-1 text-3xl font-bold">{value}</p>
          {subtitle && (
            <p className="mt-2 text-xs opacity-80">{subtitle}</p>
          )}
        </div>
        <div className={`ml-4 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${scheme.iconBg}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}