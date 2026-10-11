import * as React from "react"
import { cn } from "cn"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-lg border border-[var(--gray-6)] bg-transparent px-2.5 py-2 text-base text-[var(--gray-12)] transition-colors outline-none placeholder:text-[var(--gray-11)] focus-visible:border-[var(--primary-8)] focus-visible:ring-3 focus-visible:ring-[var(--primary-8)]/50 disabled:cursor-not-allowed disabled:bg-[var(--gray-3)] disabled:opacity-50 aria-invalid:border-[var(--tomato-9)] aria-invalid:ring-3 aria-invalid:ring-[var(--tomato-9)]/20 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
