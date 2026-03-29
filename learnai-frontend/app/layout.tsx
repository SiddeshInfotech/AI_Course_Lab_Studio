import type { Metadata } from "next";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectionWrapper from "@/components/ProtectionWrapper";
import "./globals.css";

export const metadata: Metadata = {
  title: "Learn AI - Learning Management System",
  description: "Continue your journey into the world of AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased" suppressHydrationWarning>
        <AuthProvider>
          <ProtectionWrapper>{children}</ProtectionWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
