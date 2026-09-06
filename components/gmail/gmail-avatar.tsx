import { accountAvatar } from "@/lib/branding";
import { AVATAR_COLORS, initials } from "@/lib/mail-utils";

export function GmailAvatar({
  name,
  email,
  size = 40,
  photo,
}: {
  name: string;
  email: string;
  size?: number;
  photo?: { src: string; fit: "contain" | "cover" } | null;
}) {
  const resolved = photo ?? accountAvatar(email, name);
  if (resolved) {
    return (
      <span
        className={`gmail-avatar is-photo is-${resolved.fit}`}
        style={{ width: size, height: size, background: "#111" }}
        aria-hidden
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={resolved.src} alt="" />
      </span>
    );
  }

  const background = AVATAR_COLORS[email] ?? "#9aa0a6";
  return (
    <span
      className="gmail-avatar"
      style={{
        width: size,
        height: size,
        fontSize: size < 28 ? 11 : 16,
        background,
      }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
