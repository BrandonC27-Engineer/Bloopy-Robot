"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="w-full rounded-2xl border py-3.5 text-sm font-semibold transition-all duration-200 enabled:hover:-translate-y-0.5 enabled:active:scale-[0.98] disabled:opacity-60"
      style={{
        color: "#FF3B4F",
        borderColor: "#FF3B4F4D",
        background: "#FF3B4F14",
      }}
    >
      {loading ? "Signing you out…" : "Sign out"}
    </button>
  );
}