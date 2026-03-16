import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ホテル予算管理",
  description: "ホテル費用の予算・実績管理システム",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}
