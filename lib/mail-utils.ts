import type { CharacterRow, MessageRow } from "@/types/database";

export const THREAD_SUBJECTS: Record<string, string> = {
  "ciso@gccdata.com": "Need you on the CMT bridge",
  "ceo@gccdata.com": "Before the investor breakfast",
  "pr@gccdata.com": "Arab News just emailed me",
  "customerservice@gccdata.com": "Need a script for the 800-line",
  "legal@gccdata.com": "72-hour clock, need your stance",
  "hr@gccdata.com": "Ransom screenshot on the staff groups",
};

export const THREAD_SUBJECT = THREAD_SUBJECTS["ciso@gccdata.com"] ?? "Following up";

export function threadSubject(email?: string | null): string {
  if (!email) return "Following up";
  return THREAD_SUBJECTS[email] ?? "Following up";
}

export const AVATAR_COLORS: Record<string, string> = {
  "ceo@gccdata.com": "#7baaf7",
  "ciso@gccdata.com": "#33b679",
  "pr@gccdata.com": "#f6bf26",
  "customerservice@gccdata.com": "#e67c73",
  "legal@gccdata.com": "#a142f4",
  "hr@gccdata.com": "#3c78d8",
  "dpo@gccdata.com": "#1a73e8",
};

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function snippet(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function formatGmailListDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return date.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
  });
}

export function formatGmailFullDate(iso: string): string {
  const date = new Date(iso);
  const abs = date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const deltaMs = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.round(deltaMs / 60000));
  const rel =
    minutes < 60
      ? `${minutes} minute${minutes === 1 ? "" : "s"} ago`
      : (() => {
          const hours = Math.round(minutes / 60);
          if (hours < 24) {
            return `${hours} hour${hours === 1 ? "" : "s"} ago`;
          }
          const days = Math.round(hours / 24);
          return `${days} day${days === 1 ? "" : "s"} ago`;
        })();
  return `${abs} (${rel})`;
}

export function threadMessages(
  messages: MessageRow[],
  character: CharacterRow,
  traineeEmail: string
): MessageRow[] {
  return messages.filter(
    (message) =>
      (message.sender_email === character.email &&
        message.receiver_email === traineeEmail) ||
      (message.sender_email === traineeEmail &&
        message.receiver_email === character.email)
  );
}

export function latestMessage(
  messages: MessageRow[],
  character: CharacterRow,
  traineeEmail: string
): MessageRow | undefined {
  const thread = threadMessages(messages, character, traineeEmail);
  return thread[thread.length - 1];
}

export function latestInbound(
  messages: MessageRow[],
  character: CharacterRow,
  traineeEmail: string
): MessageRow | undefined {
  const inbound = threadMessages(messages, character, traineeEmail).filter(
    (message) =>
      message.sender_email === character.email &&
      message.receiver_email === traineeEmail
  );
  return inbound[inbound.length - 1];
}

export function isThreadUnread(
  messages: MessageRow[],
  character: CharacterRow,
  traineeEmail: string,
  readAt?: string
): boolean {
  const inbound = latestInbound(messages, character, traineeEmail);
  if (!inbound) return false;
  if (!readAt) return true;
  return inbound.created_at > readAt;
}
