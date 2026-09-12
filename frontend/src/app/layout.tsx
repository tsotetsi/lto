import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";

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
    <html lang="en" className="dark-theme">
      <body className="h-screen w-screen overflow-hidden antialiased bg-theme-primary text-theme-primary transition-colors duration-200">
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
