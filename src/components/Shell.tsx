"use client";

import { usePathname } from "next/navigation";
import NavBar from "./NavBar";

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNav = pathname?.startsWith("/login");

  return (
    <>
      {!hideNav && <NavBar />}
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </>
  );
}
