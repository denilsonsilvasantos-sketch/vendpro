import React from 'react';

export const Card = ({ children, className = '', title, value, icon }: { children?: React.ReactNode, className?: string, title?: string, value?: string | number, icon?: React.ReactNode }) => {
  return (
    <div className={`bg-white rounded-[40px] border border-slate-100 shadow-sm p-8 hover:neumorphic-shadow transition-all duration-500 ${className}`}>
      {title ? (
        <div className="flex items-center justify-between mb-4">
          <span className="text-slate-500 font-black uppercase tracking-widest text-[10px]">{title}</span>
          <div className="text-primary/60">
            {icon}
          </div>
        </div>
      ) : null}
      {value !== undefined ? (
        <div className="text-2xl font-black text-slate-900 tracking-tight">{value}</div>
      ) : null}
      {children}
    </div>
  );
};
