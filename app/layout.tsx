import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/components/SessionProvider";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SecureLedger — Intelligent Fintech & Fraud Detection Engine",
  description:
    "Full-stack personal transaction tracker with a real-time rule-based fraud and anomaly detection screening layer.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased selection:bg-blue-500/30 selection:text-blue-200`}>
        <SessionProvider>
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
          <footer className="border-t border-slate-900 bg-slate-950/90 py-6 text-center text-xs text-slate-500">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
              <p>SecureLedger — Institutional-grade Fraud Screening & Immutable Ledger</p>
              <p className="text-slate-600">Built with Next.js 14, TypeScript, Mongoose & Recharts</p>
            </div>
          </footer>
        </SessionProvider>
      </body>
    </html>
  );
}
