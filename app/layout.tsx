import type { Metadata } from "next";
import { SiteHeader } from "./site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lễ này ăn gì?",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi">
      <body className="min-h-dvh bg-[#f5f5ed] text-[#26362b]">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
