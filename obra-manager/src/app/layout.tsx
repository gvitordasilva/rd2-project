import type { Metadata } from "next";
import "./globals.css";
import { ToastContextProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: "Obra Manager — Sistema de Gerenciamento de Obras",
  description: "Gerencie obras, funcionários, financeiro e maquinário em um só lugar.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <ToastContextProvider>
          {children}
        </ToastContextProvider>
      </body>
    </html>
  );
}
