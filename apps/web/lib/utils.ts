import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function currency(value: number, code = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: code,
    maximumFractionDigits: 0,
  }).format(value);
}

export function percentage(value: number) {
  return `${Math.round(value)}%`;
}

export function truncate(str: string, len: number) {
  return str.length > len ? str.slice(0, len) + "…" : str;
}

export function slugify(str: string) {
  return str.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function discount(original: number, current: number) {
  return Math.round(((original - current) / original) * 100);
}
