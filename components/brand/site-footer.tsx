import { CLIENT, PRODUCT, STUDIO } from "@/lib/branding";

export function GccLogo({
  className,
  alt = CLIENT.name,
}: {
  className?: string;
  alt?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={CLIENT.logo} alt={alt} className={className} />
  );
}

export function ArchwaresLogo({
  className,
  alt = STUDIO.name,
}: {
  className?: string;
  alt?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={STUDIO.logo} alt={alt} className={className} />
  );
}

export function SiteFooter() {
  return (
    <footer className="brand-footer">
      <div className="brand-footer-lockup">
        <a
          className="brand-footer-org"
          href={CLIENT.url}
          target="_blank"
          rel="noreferrer"
        >
          <GccLogo className="brand-logo-gcc" />
          <span className="brand-footer-caption">
            <small>Client · {CLIENT.location}</small>
          </span>
        </a>
        <span className="brand-footer-rule" aria-hidden="true" />
        <p className="brand-footer-product">
          {PRODUCT.name}
          <small>{PRODUCT.confidentiality}</small>
        </p>
        <span className="brand-footer-rule" aria-hidden="true" />
        <a
          className="brand-footer-org"
          href={STUDIO.url}
          target="_blank"
          rel="noreferrer"
        >
          <ArchwaresLogo className="brand-logo-archwares" alt="" />
          <span>
            <strong>Built by {STUDIO.name}</strong>
            <small>{STUDIO.location}</small>
          </span>
        </a>
      </div>
    </footer>
  );
}
