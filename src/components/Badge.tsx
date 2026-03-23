import React from 'react';

export const Badge = ({ children, color = 'primary' }: { children: React.ReactNode, color?: string }) => {
  const colors: Record<string, string> = {
    primary: 'bg-blue-100 text-blue-700',
    gold: 'bg-yellow-100 text-yellow-700',
    green: 'bg-emerald-50 text-emerald-600',
    red: 'bg-rose-50 text-rose-600',
    gray: 'bg-slate-100 text-slate-600',
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] ${colors[color] || colors.primary}`}>
      {children}
    </span>
  );
};
