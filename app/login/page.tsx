import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import { LoginForm } from "@/app/login/login-form";
import { GccLogo, SiteFooter } from "@/components/brand/site-footer";
import { CLIENT, PRODUCT, STUDIO } from "@/lib/branding";
import { cn } from "@/lib/utils";

const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: `Sign in · ${PRODUCT.name}`,
  description: `${CLIENT.name} crisis-response training, built by ${STUDIO.name}.`,
};

export default function LoginPage() {
  return (
    <div className={cn("portal", plex.className)}>
      <main className="portal-main">
        <div className="portal-sheet">
          <GccLogo className="brand-logo-gcc brand-logo-gcc-hero" />
          <span className="portal-rule" aria-hidden="true" />
          <p className="portal-product">{PRODUCT.name}</p>
          <h1>Sign in</h1>
          <p className="portal-lead">
            You are the DPO in a simulated ransomware incident. Follow the
            playbook in the inbox.
          </p>
          <LoginForm />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
