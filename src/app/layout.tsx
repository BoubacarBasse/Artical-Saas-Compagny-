import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Article Orders",
  description: "Order articles and track them through production.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
