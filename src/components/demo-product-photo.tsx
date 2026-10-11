"use client";

import { useState } from "react";
import type { MouseEvent } from "react";
import type { DemoProduct } from "@/demo/data";

type Props = { product: DemoProduct; locale: "ar" | "en"; compact?: boolean };

// Preserve real anchors while moving keyboard focus within the single-screen preview.
export function StoreSectionLink({ target, children, className }: {
  target: string; children: React.ReactNode; className?: string;
}) {
  function focusSection(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    document.getElementById(target)?.focus({ preventScroll: true });
  }
  return <a href={`#${target}`} className={className} onClick={focusSection}>{children}</a>;
}

export function DemoScenePhoto({ src, alt, eager = false }: {
  src: string; alt: string; eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return failed ? <span className="demo-scene-fallback" role="img" aria-label={alt}>
    <svg viewBox="0 0 48 48" width="80" height="80" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="13" y="4" width="22" height="40" rx="5"/><path d="M21 9h6M22 39h4"/></svg>
    <span>{alt}</span>
  </span> : (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : "auto"} decoding="async" onError={() => setFailed(true)} />
  );
}

export function DemoProductPhoto({ product, locale, compact = false }: Props) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const label = locale === "ar" ? product.nameAr : product.nameEn;
  const imageUrl = product.imageUrl;
  const hasPhoto = Boolean(imageUrl && imageUrl !== failedUrl);

  return <span className={`demo-product-photo${compact ? " compact" : ""}`} data-product-id={product.id}>
    {hasPhoto ? (
      // The sample photos are external and may fail to load. Actual store media must be supplied by its owner.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={imageUrl} alt={label} loading={compact ? "eager" : "lazy"}
        decoding="async" referrerPolicy="no-referrer" onError={() => setFailedUrl(imageUrl ?? null)} />
    ) : (
      <span className="demo-photo-fallback" role="img" aria-label={label}>
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.6"
          width="42" height="42" aria-hidden="true">
          {product.type === "DEVICE"
            ? <><rect x="13" y="4" width="22" height="40" rx="5"/><path d="M21 9h6M22 39h4"/></>
            : product.type === "PART"
              ? <><path d="M10 13h28v22H10zM16 18h16v12H16z"/><path d="M15 7v6m9-6v6m9-6v6M15 35v6m9-6v6m9-6v6"/></>
              : <><rect x="7" y="13" width="34" height="25" rx="5"/><path d="M13 22h22M18 8h12"/></>}
        </svg>
        {!compact && <small>{locale==="ar"?"صورة توضيحية":"Preview image"}</small>}
      </span>
    )}
  </span>;
}
