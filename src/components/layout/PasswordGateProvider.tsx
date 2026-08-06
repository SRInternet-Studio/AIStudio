"use client";

import PasswordGate from "@/components/layout/PasswordGate";

export default function PasswordGateProvider({ children }: { children: React.ReactNode }) {
  return <PasswordGate>{children}</PasswordGate>;
}
