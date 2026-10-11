"use client";

import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

import { Input } from "@/components/ui/input";

type PasswordFieldProps = Omit<React.ComponentProps<typeof Input>, "type">;

export function PasswordField({ className, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input className={`h-10 pr-10 ${className ?? ""}`} type={visible ? "text" : "password"} {...props} />
      <button
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-[var(--gray-11)] transition-colors hover:text-[var(--gray-12)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--primary-8)]"
        onClick={() => setVisible((current) => !current)}
        type="button"
      >
        {visible ? <EyeSlashIcon aria-hidden="true" className="size-4" /> : <EyeIcon aria-hidden="true" className="size-4" />}
      </button>
    </div>
  );
}
