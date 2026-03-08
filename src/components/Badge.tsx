import React from 'react';

export const Badge = ({ children, color = 'primary' }: { children: React.ReactNode, color?: string }) => {
  const colors: Record<string, string> = {
    primary: 'bg-primary-light text-primary',
    gold: 'bg-gold-soft text-gold',
    green: 'bg-emerald-50 text-emerald-600',
    red: 'bg-rose-50 text-rose-600',
    gray: 'bg-slate-100 text-slate-600',
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${colors[color] || colors.primary}`}>
      {children}
    </span>
  );
};
