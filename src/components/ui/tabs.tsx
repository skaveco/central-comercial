"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import * as React from "react";
import { cn } from "cn";

function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      className={cn("flex flex-col gap-2", className)}
      data-slot="tabs"
      {...props}
    />
  );
}

function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      activateOnFocus
      className={cn(
        "inline-flex h-8 w-fit items-center rounded-lg bg-[var(--gray-3)] p-1 text-[var(--gray-11)]",
        className,
      )}
      data-slot="tabs-list"
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      className={cn(
        "inline-flex h-6 min-w-0 cursor-pointer items-center justify-center rounded-md border border-transparent px-2 text-xs font-medium whitespace-nowrap transition-colors outline-none focus-visible:border-[var(--primary-8)] focus-visible:ring-3 focus-visible:ring-[var(--primary-8)]/40 data-active:bg-[var(--gray-1)] data-active:text-[var(--gray-12)] data-active:shadow-sm disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      data-slot="tabs-trigger"
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      className={cn("flex-1 outline-none", className)}
      data-slot="tabs-content"
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
