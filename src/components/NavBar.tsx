"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/", label: "Panel" },
  { href: "/kb", label: "Bilgi Bankası" },
  { href: "/articles", label: "Makaleler" },
  { href: "/settings", label: "Ayarlar" }
];

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();

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
        <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-800">
          Çıkış yap
        </button>
      </div>
    </header>
  );
}
