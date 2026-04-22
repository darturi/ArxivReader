import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ArXiv Reader",
  description: "Discover, organize, and annotate research papers from ArXiv.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-stone-50">
        {children}
      </body>
    </html>
  );
}
