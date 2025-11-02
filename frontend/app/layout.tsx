import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "AuraChat - Encrypted P2P Messaging",
  description: "Peer-to-peer encrypted messaging with FHE on-chain storage",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground antialiased">
        <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-slate-50 via-cyan-50 to-slate-50 z-[-20]"></div>
        <Providers>
          <main className="flex flex-col min-h-screen">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
