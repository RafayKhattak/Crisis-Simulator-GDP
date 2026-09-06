export const CLIENT = {
  name: "GCC Data Protection",
  shortName: "GCC",
  url: "https://gccdataprotection.com",
  location: "Riyadh · London",
  logo: "/brand/gcc.png",
} as const;

export const STUDIO = {
  name: "Archwares",
  url: "https://archwares.com",
  location: "Islamabad",
  logo: "/brand/archwares.png",
} as const;

export const PRODUCT = {
  name: "Crisis Simulator",
  tagline: "PDPL incident-response training",
  confidentiality: "Private trainee session",
} as const;

export type AccountAvatar = {
  src: string;
  fit: "contain" | "cover";
};

export function accountAvatar(
  email?: string | null,
  name?: string | null
): AccountAvatar | null {
  const haystack = `${email ?? ""} ${name ?? ""}`.toLowerCase();
  if (haystack.includes("rafay") || haystack.includes("archwares.com")) {
    return { src: STUDIO.logo, fit: "cover" };
  }
  if (haystack.includes("bilal") || haystack.includes("gccdataprotection.com")) {
    return { src: "/brand/bilal.png", fit: "cover" };
  }
  return null;
}
