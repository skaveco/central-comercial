"use client";

import { useState, type ReactNode } from "react";

import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";

type AppShellProps = {
  children: ReactNode;
  user: {
    name: string;
    role: "admin" | "pre_sales" | "commercial";
  };
};

export function AppShell({ children, user }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[var(--gray-3)]">
      <AppSidebar collapsed={sidebarCollapsed} user={user} />
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((collapsed) => !collapsed)}
        />
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>
  );
}
