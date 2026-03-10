import React from 'react';

export const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => {
  return (
    <div className={`bg-white rounded-[32px] border border-slate-100 shadow-sm ${className}`}>
      {children}
    </div>
  );
};
