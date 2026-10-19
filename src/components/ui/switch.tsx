"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "cn";

function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full bg-[var(--gray-6)] p-0.5 outline-none transition-colors data-checked:bg-[var(--primary-9)] focus-visible:ring-3 focus-visible:ring-[var(--primary-8)]/50 data-disabled:pointer-events-none data-disabled:opacity-50",
        className,
      )}
      data-slot="switch"
      {...props}
    >
      <SwitchPrimitive.Thumb
        className="block size-4 rounded-full bg-white shadow-sm transition-transform data-checked:translate-x-4"
        data-slot="switch-thumb"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
