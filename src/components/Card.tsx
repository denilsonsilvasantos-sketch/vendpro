import React from 'react';

export const Card = ({ children, className = '', title, value, icon }: { children?: React.ReactNode, className?: string, title?: string, value?: string | number, icon?: React.ReactNode }) => {
  return (
    <div className={`bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 ${className}`}>
      {title ? (
        <div className="flex items-center justify-between mb-4">
          <span className="text-slate-500 font-medium">{title}</span>
          {icon}
        </div>
      ) : null}
      {value !== undefined ? (
        <div className="text-2xl font-bold text-slate-900">{value}</div>
      ) : null}
      {children}
    </div>
  );
};
