"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push("/login");
      return;
    }
    setAuthorized(true);
  }, [router]);

  if (!authorized) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center gap-3 bg-[#0A0B0D]">
        <div className="w-8 h-8 border-2 border-[#00F5C4] border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] uppercase font-bold tracking-widest text-[#9FA6B2]">Authenticating session...</p>
      </div>
    );
  }

  return <>{children}</>;
}
