"use client";

import { useState } from "react";
import type { DemoProduct } from "@/demo/data";

type Props = { product: DemoProduct; locale: "ar" | "en"; compact?: boolean };

export function DemoProductPhoto({ product, locale, compact = false }: Props) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const label = locale === "ar" ? product.nameAr : product.nameEn;
  const imageUrl = product.imageUrl;
  const hasPhoto = !!imageUrl && imageUrl !== failedUrl;

  return (
    <span className={`demo-product-photo${compact ? " compact" : ""}`} data-product-id={product.id}>
      {hasPhoto ? (
        // External image URLs are intentionally unoptimized in this isolated visual pilot.
        // Production requires reviewed, licensed, locally hosted product media.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={label}
          loading={compact ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailedUrl(imageUrl)}
        />
      ) : (
        <span className="demo-photo-fallback" role="img" aria-label={label}>
          <span aria-hidden="true">{product.type === "DEVICE" ? "▯" : product.type === "PART" ? "⌁" : "□"}</span>
          <small>{product.brand}</small>
        </span>
      )}
    </span>
  );
}
