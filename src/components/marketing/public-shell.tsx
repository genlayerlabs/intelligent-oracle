"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import {
  SITE_COPYRIGHT_YEAR,
  SITE_DISCORD_URL,
  SITE_GITHUB_URL,
  SITE_OWNER_NAME,
} from "@/lib/site-meta";
import { cn } from "@/lib/utils";

interface PublicHeaderProps {
  active?: "home" | "docs";
  revealOnScroll?: boolean;
}

export function PublicHeader({ active = "home", revealOnScroll = false }: PublicHeaderProps) {
  const [visible, setVisible] = useState(!revealOnScroll);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!revealOnScroll) return;
    let ticking = false;
    const update = () => {
      const threshold = window.innerHeight * 0.85;
      setVisible(window.scrollY > threshold);
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", update);
    };
  }, [revealOnScroll]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!visible && mobileOpen) setMobileOpen(false);
  }, [visible, mobileOpen]);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 border-b border-black/10 bg-white/90 text-[#2e2e2e] backdrop-blur-xl transition-all duration-300 ease-out",
          visible ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-full opacity-0",
        )}
      >
        <div className="mx-auto flex min-h-20 w-[90%] max-w-[1300px] items-center justify-between gap-4 py-3">
          <Link href="/" className="flex min-w-0 items-center gap-3 text-[#2e2e2e]" aria-label="Intelligent Oracle home">
            <Image
              src="/brand/genlayer-mark.svg"
              alt=""
              width={30}
              height={28}
              priority
            />
            <span className="truncate text-lg font-medium tracking-normal">Intelligent Oracle</span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-black/70 lg:flex">
            <Link className={navLinkClass(active === "home")} href="/#overview">
              Overview
            </Link>
            <Link className={navLinkClass(false)} href="/#how-it-works">
              How it works
            </Link>
            <Link className={navLinkClass(false)} href="/#use-cases">
              Use cases
            </Link>
          </nav>

          <div className="hidden shrink-0 items-center gap-2 lg:flex">
            <Button
              asChild
              className="border-black bg-transparent text-[#2e2e2e] hover:bg-black hover:text-white"
              variant="outline"
            >
              <Link href="/docs">Docs</Link>
            </Button>
            <Button asChild className="bg-black text-white hover:bg-[color:var(--brand-lavender)]">
              <Link href="/assistant">
                Try It
                <ArrowUpRight className="size-4" aria-hidden />
              </Link>
            </Button>
          </div>

          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md border border-black/15 p-2 text-[#2e2e2e] transition hover:bg-black/5 lg:hidden"
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </header>

      <div
        id="mobile-menu"
        className={cn(
          "fixed inset-0 z-40 bg-white text-[#2e2e2e] transition-opacity duration-200 lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden={!mobileOpen}
      >
        <div className="mx-auto flex h-full w-[90%] max-w-[1300px] flex-col gap-7 pb-12 pt-28">
          <Link
            href="/#overview"
            onClick={() => setMobileOpen(false)}
            className="text-2xl font-medium text-black"
          >
            Overview
          </Link>
          <Link
            href="/#how-it-works"
            onClick={() => setMobileOpen(false)}
            className="text-2xl font-medium text-black"
          >
            How it works
          </Link>
          <Link
            href="/#use-cases"
            onClick={() => setMobileOpen(false)}
            className="text-2xl font-medium text-black"
          >
            Use cases
          </Link>
          <Link
            href="/docs"
            onClick={() => setMobileOpen(false)}
            className="text-2xl font-medium text-black"
          >
            Docs
          </Link>
          <Button
            asChild
            className="mt-4 h-12 w-fit bg-black px-7 text-white hover:bg-[color:var(--brand-lavender)]"
          >
            <Link href="/assistant" onClick={() => setMobileOpen(false)}>
              Try It
              <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </>
  );
}

export function PublicFooter() {
  return (
    <footer className="mt-24 text-[#2e2e2e]">
      <div className="mx-auto w-[90%] max-w-[1300px]">
        <section className="flex min-h-72 flex-col items-center justify-center gap-5 px-6 py-14 text-center text-white [background-image:var(--gradient-brand-strong)]">
          <h2 className="max-w-4xl text-balance text-[clamp(2rem,5vw,4.5rem)] font-medium leading-[1.05]">
            Cheaper, faster, scalable oracle resolution.
          </h2>
          <p className="max-w-2xl text-lg font-light leading-8 text-white/90">
            Intelligent Oracle keeps market definitions, live evidence, and validator consensus in one flow.
          </p>
          <Button asChild className="bg-white text-black hover:bg-black hover:text-white">
            <Link href="/assistant">Get Started</Link>
          </Button>
        </section>
      </div>

      <div className="mt-16 bg-[color:color-mix(in_oklab,var(--brand-lavender)_10%,transparent)]">
        <div className="mx-auto grid w-[90%] max-w-[1300px] items-center gap-8 py-10 text-center md:grid-cols-[1fr_auto_1fr] md:text-left">
          <Link href="/" className="flex items-center justify-center gap-3 md:justify-self-start">
            <BrandMark className="size-7 text-black" />
            <span className="text-base font-medium">Intelligent Oracle</span>
          </Link>

          <p className="text-sm text-black/55">&copy; {SITE_OWNER_NAME} {SITE_COPYRIGHT_YEAR}</p>

          <nav className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-black/70 md:justify-self-end">
            <Link className="hover:text-black" href="/docs">
              Docs
            </Link>
            <Link className="hover:text-black" href="/explorer">
              Explorer
            </Link>
            <a className="hover:text-black" href={SITE_GITHUB_URL} rel="noreferrer" target="_blank">
              Github
            </a>
            {SITE_DISCORD_URL ? (
              <a className="hover:text-black" href={SITE_DISCORD_URL} rel="noreferrer" target="_blank">
                Community
              </a>
            ) : null}
          </nav>
        </div>
      </div>
    </footer>
  );
}

function navLinkClass(active: boolean) {
  return cn("transition hover:text-black", active ? "text-black" : "text-black/70");
}
