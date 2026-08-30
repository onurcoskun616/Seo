"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ROLE_LABELS_CLIENT } from "@/lib/roleLabels";

const links = [
  { href: "/", label: "Panel" },
  { href: "/kb", label: "Bilgi Bankası" },
  { href: "/articles", label: "Makaleler" },
  { href: "/calendar", label: "Takvim" },
  { href: "/research", label: "Konu Araştırma" },
  { href: "/performance", label: "Performans" },
  { href: "/settings", label: "Ayarlar" }
];

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user));
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-8">
          <span className="text-sm font-semibold text-brand-700">
            Topkapı Okulları · SEO/GEO İçerik Motoru
          </span>
          <nav className="flex gap-1">
            {links.map((l) => {
              const active = pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href));
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                    active ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <span className="text-xs text-gray-500">
              {user.name} · {ROLE_LABELS_CLIENT[user.role] || user.role}
            </span>
          )}
          <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-800">
            Çıkış yap
          </button>
        </div>
      </div>
    </header>
  );
}
