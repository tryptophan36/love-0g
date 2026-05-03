"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/create", label: "Create Agent" },
  { href: "/agents", label: "My Agents" },
  { href: "/match", label: "Matches" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-og-border backdrop-blur-xl bg-[rgba(26,26,31,0.85)]">
      <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-10">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="text-xl font-bold tracking-tight og-gradient-text">LOVE·0G</span>
            <span className="text-[10px] text-og-label bg-og-surface px-2 py-0.5 rounded-full border border-og-border uppercase tracking-wider">
              Beta
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-7">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm transition-colors duration-200 ${
                  pathname === link.href
                    ? "text-og-light font-medium"
                    : "text-og-label hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <ConnectButton
          showBalance={false}
          chainStatus="icon"
          accountStatus="avatar"
        />
      </div>
    </nav>
  );
}
