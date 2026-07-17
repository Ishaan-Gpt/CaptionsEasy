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
      <div className="h-screen w-full flex flex-col items-center justify-center gap-4 bg-dune-white">
        <div className="w-8 h-8 border-2 border-sand-300 border-t-sand-700 rounded-full animate-spin" />
        <p className="font-sora text-[13px] font-semibold text-sand-700">Checking your session…</p>
      </div>
    );
  }

  return <>{children}</>;
}
