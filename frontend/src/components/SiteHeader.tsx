"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const TABS = [
  { label: "Clan War", href: "/" },
  { label: "Similar Normies Search", href: "/archive/tree" },
] as const;

function isTabActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function SiteHeader() {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const hasEntered = useRef(false);
  const [underline, setUnderline] = useState({ left: 0, width: 0 });
  const [animate, setAnimate] = useState(false);

  useLayoutEffect(() => {
    const measure = () => {
      const nav = navRef.current;
      const activeIndex = TABS.findIndex((tab) =>
        isTabActive(pathname, tab.href),
      );
      const activeEl = tabRefs.current[activeIndex >= 0 ? activeIndex : 0];
      if (!nav || !activeEl) return null;

      const navRect = nav.getBoundingClientRect();
      const tabRect = activeEl.getBoundingClientRect();
      return {
        left: tabRect.left - navRect.left,
        width: tabRect.width,
      };
    };

    const next = measure();
    if (!next) return;

    if (!hasEntered.current) {
      hasEntered.current = true;
      setUnderline({ left: next.left, width: 0 });
      requestAnimationFrame(() => {
        setAnimate(true);
        setUnderline(next);
      });
      return;
    }

    setUnderline(next);
  }, [pathname]);

  useLayoutEffect(() => {
    const onResize = () => {
      const nav = navRef.current;
      const activeIndex = TABS.findIndex((tab) =>
        isTabActive(pathname, tab.href),
      );
      const activeEl = tabRefs.current[activeIndex >= 0 ? activeIndex : 0];
      if (!nav || !activeEl) return;

      const navRect = nav.getBoundingClientRect();
      const tabRect = activeEl.getBoundingClientRect();
      setUnderline({
        left: tabRect.left - navRect.left,
        width: tabRect.width,
      });
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [pathname]);

  return (
    <header className="border-b border-zinc-200/80 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50">
            <span className="block h-2 w-2 rounded-sm bg-zinc-950" />
          </span>
          <span className="text-sm font-medium tracking-tight">
            The Norm of Normies
          </span>
        </Link>

        <nav
          ref={navRef}
          className="relative hidden items-center gap-8 sm:flex"
          aria-label="Main"
        >
          {TABS.map((tab, index) => {
            const active = isTabActive(pathname, tab.href);
            return (
              <Link
                key={tab.href}
                ref={(el) => {
                  tabRefs.current[index] = el;
                }}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "relative z-10 inline-block pb-2 text-sm transition-colors duration-200",
                  active ? "text-zinc-950" : "text-zinc-500 hover:text-zinc-800",
                ].join(" ")}
              >
                {tab.label}
              </Link>
            );
          })}

          <span
            aria-hidden
            className={[
              "pointer-events-none absolute bottom-0 left-0 h-0.5 rounded-full bg-zinc-950",
              animate
                ? "transition-[transform,width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
                : "",
            ].join(" ")}
            style={{
              transform: `translateX(${underline.left}px)`,
              width: Math.max(underline.width, 0),
            }}
          />
        </nav>

        <ConnectButton />
      </div>
    </header>
  );
}
