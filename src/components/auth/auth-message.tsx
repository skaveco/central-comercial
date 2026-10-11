import { cn } from "cn";

type AuthMessageProps = {
  children: string;
  tone: "error" | "success" | "warning";
};

const toneClasses = {
  error: "border-[var(--tomato-6)] bg-[var(--tomato-3)] text-[var(--tomato-11)]",
  success: "border-[var(--grass-6)] bg-[var(--grass-3)] text-[var(--grass-11)]",
  warning: "border-[var(--amber-6)] bg-[var(--amber-3)] text-[var(--amber-11)]",
};

export function AuthMessage({ children, tone }: AuthMessageProps) {
  return (
    <div
      aria-live="polite"
      className={cn("mb-5 rounded-lg border px-3 py-2.5 text-sm leading-5", toneClasses[tone])}
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
