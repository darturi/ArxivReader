"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/db/browser-client";
import { useEffect, useState } from "react";

export default function NavBar() {
  const pathname = usePathname();
  const [user, setUser] = useState<{
    name: string;
    avatar: string | null;
  } | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (u) {
        setUser({
          name:
            u.user_metadata?.full_name || u.email?.split("@")[0] || "User",
          avatar: u.user_metadata?.avatar_url || null,
        });
      }
    });
  }, []);

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const navLinks = [
    { href: "/list/read", label: "Read" },
    { href: "/list/to-read", label: "To Read" },
    { href: "/tags", label: "Tags" },
    { href: "/search", label: "Search" },
  ];

  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <nav className="flex items-center gap-1">
          <Link
            href="/list/read"
            className="text-sm font-semibold text-stone-900 mr-4"
          >
            ArXiv Reader
          </Link>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
                pathname === link.href
                  ? "bg-stone-100 text-stone-900 font-medium"
                  : "text-stone-500 hover:text-stone-700 hover:bg-stone-50"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {user && (
            <>
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-7 h-7 rounded-full"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-stone-200 flex items-center justify-center text-xs font-medium text-stone-600">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <button
                onClick={handleSignOut}
                className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
              >
                Sign out
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
