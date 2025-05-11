"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push("/create-pool");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#1e1c1f] text-white font-mono flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#8b5cf6] mx-auto mb-4"></div>
        <p className="text-[#ffe1ff]">Redirecting to Create Pool...</p>
      </div>
    </div>
  );
}
