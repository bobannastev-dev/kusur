"use client";

// Лебдечко стаклено мени долу: четирите екрани, активниот е полн.

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./BottomNav.module.css";

const ITEMS = [
  {
    href: "/",
    label: "Кошничка",
    icon: (
      <>
        <path d="M5 8h14l-1.5 11a2 2 0 0 1-2 1.7h-7a2 2 0 0 1-2-1.7z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </>
    ),
  },
  {
    href: "/poevtineto/",
    label: "Поевтинето",
    icon: (
      <>
        <path d="M3 7l6 6 4-4 8 8" />
        <path d="M15 17h6v-6" />
      </>
    ),
  },
  {
    href: "/prebaraj/",
    label: "Пребарај",
    icon: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </>
    ),
  },
  {
    href: "/prodavnici/",
    label: "Продавници",
    icon: (
      <>
        <path d="M4 10l1.5-5h13L20 10" />
        <path d="M5 10v9h14v-9" />
        <path d="M4 10h16" />
        <path d="M10 19v-5h4v5" />
      </>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const current = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href.replace(/\/$/, "")));

  return (
    <nav aria-label="Главно мени" className={`glass ${styles.nav}`}>
      {ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={current(item.href) ? `${styles.item} ${styles.active}` : styles.item}
          aria-current={current(item.href) ? "page" : undefined}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {item.icon}
          </svg>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
