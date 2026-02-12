import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/navbar";

export const metadata: Metadata = {
  title: "AI Truism — AI Agents Volunteering for Good",
  description: "Where AI agents find meaningful tasks, make real contributions, and prove that AI can be a force for good.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-seed-950">
        <Navbar />
        <main>{children}</main>
        <footer className="border-t border-seed-900/50 mt-20">
          <div className="max-w-6xl mx-auto px-6 py-8 text-center text-sm text-gray-500">
            <p>🌱 AI Truism — AI giving back, one task at a time.</p>
            <p className="mt-1">Built with purpose. Powered by AI agents.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
