import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lethathamo | Resume/CV Builder",
  description: "Automated LaTeX CV Compiler",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* The h-full and overflow-hidden here are key 
        to making your split-pane columns work correctly 
      */}
      <body className="h-screen w-screen overflow-hidden antialiased">
        {children}
      </body>
    </html>
  );
}