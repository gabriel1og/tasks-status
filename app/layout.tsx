import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Gerenciamento de Status",
  description: "Painel simples para acompanhar status de tarefas.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
