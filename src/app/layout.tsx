import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import { QAEnvironmentProvider } from "@/contexts/QAEnvironmentContext";
import { AutoLogoutProvider } from "@/components/AutoLogoutProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import AuthHeader from "@/components/AuthHeader";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "QA Dashboard",
  description: "Multi-Project QA Dashboard System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <AuthProvider>
          <QAEnvironmentProvider>
            <AutoLogoutProvider>
              <ProtectedRoute>
                <div className="min-h-screen bg-slate-100">
                  <AuthHeader />
                  <div className="pt-0">
                    {children}
                  </div>
                </div>
              </ProtectedRoute>
            </AutoLogoutProvider>
          </QAEnvironmentProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
