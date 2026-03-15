'use client';

import React from 'react';

interface ScreenContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  scroll?: boolean;
}

export function ScreenContainer({
  children,
  scroll = true,
  ...props
}: ScreenContainerProps) {
  if (scroll) {
    return (
      <div className="flex-1 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div
          className="flex-1 overflow-auto pb-24"
          {...props}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="flex-1" {...props}>
        {children}
      </div>
    </div>
  );
}
