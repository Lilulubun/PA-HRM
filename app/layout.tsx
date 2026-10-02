import type { Metadata } from "next";
import { PathNav } from "../components/path-nav";
import { SessionNav } from "../components/session-nav";

export const metadata: Metadata = {
  title: "PA-HRM",
  description: "Evidence-traceable performance appraisal prototype",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header style={{ borderBottom: "1px solid #ddd", marginBottom: "1rem" }}>
          <strong>PA-HRM</strong>
          <SessionNav />
        </header>
        {children}
      </body>
    </html>
  );
}
