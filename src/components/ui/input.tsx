import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-[var(--gray-6)] bg-transparent px-2.5 py-1 text-base text-[var(--gray-12)] transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[var(--gray-12)] placeholder:text-[var(--gray-11)] focus-visible:border-[var(--primary-8)] focus-visible:ring-3 focus-visible:ring-[var(--primary-8)]/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-[var(--gray-3)] disabled:opacity-50 aria-invalid:border-[var(--tomato-9)] aria-invalid:ring-3 aria-invalid:ring-[var(--tomato-9)]/20 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
