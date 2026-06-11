import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SalesMemory – B2B Account Intelligence Agent",
  description:
    "AI-powered account intelligence for B2B sales teams. Never lose deal context again — every call note, stakeholder insight, and competitive fact remembered.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
