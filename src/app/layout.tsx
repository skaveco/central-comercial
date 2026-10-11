import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Central Comercial Skave",
  description: "Central de gestão comercial da Skave.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className="h-full antialiased"
    >
      <body className="min-h-dvh bg-[var(--gray-3)]">{children}</body>
    </html>
  );
}
