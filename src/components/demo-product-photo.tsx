"use client";

import { useState } from "react";
import type { DemoProduct } from "@/demo/data";

type Props = { product: DemoProduct; locale: "ar" | "en"; compact?: boolean };

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
