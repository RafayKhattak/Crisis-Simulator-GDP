import type { SessionNudge } from "@/types/api";

export type MailboxChrome = {
  readAt: Record<string, string>;
  starred: string[];
  nudges: SessionNudge[];
};

function storageKey(traineeId: string): string {
  return `gcc_sim_mailbox_${traineeId}`;
}

export function emptyMailboxChrome(): MailboxChrome {
  return { readAt: {}, starred: [], nudges: [] };
}

export function loadMailboxChrome(traineeId: string): MailboxChrome {
  if (typeof window === "undefined") return emptyMailboxChrome();
  try {
    const raw = window.localStorage.getItem(storageKey(traineeId));
    if (!raw) return emptyMailboxChrome();
    const parsed = JSON.parse(raw) as Partial<MailboxChrome>;
    return {
      readAt:
        parsed.readAt && typeof parsed.readAt === "object" ? parsed.readAt : {},
      starred: Array.isArray(parsed.starred)
        ? parsed.starred.filter((id): id is string => typeof id === "string")
        : [],
      nudges: Array.isArray(parsed.nudges) ? parsed.nudges : [],
    };
  } catch {
    return emptyMailboxChrome();
  }
}

export function saveMailboxChrome(
  traineeId: string,
  chrome: MailboxChrome
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(traineeId), JSON.stringify(chrome));
}

export function clearMailboxChrome(traineeId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(storageKey(traineeId));
}

export function laterStamp(...stamps: Array<string | undefined>): string {
  const valid = stamps.filter((stamp): stamp is string => Boolean(stamp));
  if (valid.length === 0) return new Date().toISOString();
  return valid.sort()[valid.length - 1] ?? new Date().toISOString();
}
