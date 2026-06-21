import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCredits(n: number) {
  return n.toLocaleString();
}

export function timeAgo(date: string) {
  const d = new Date(date);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function getInitials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").map(n => n?.[0] || "").join("").toUpperCase().slice(0, 2);
}

export const MODULE_COLORS = [
  "from-indigo-500 to-violet-600",
  "from-blue-500 to-cyan-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-purple-500 to-fuchsia-600",
];

export function getModuleColor(id: number) {
  return MODULE_COLORS[id % MODULE_COLORS.length];
}

export const NOTE_COLORS = [
  "#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899",
];

