"use client";

import { useVideoProtection } from "@/hooks/useVideoProtection";

export default function ProtectionWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  // Apply protection globally
  useVideoProtection();

  return <>{children}</>;
}
