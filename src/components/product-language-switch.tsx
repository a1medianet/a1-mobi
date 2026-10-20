"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function ProductLanguageSwitch({locale}:{locale:"ar"|"en"}){
  const other=locale==="ar"?"en":"ar";
  const pathname=usePathname();
  const prefix="/product/"+locale;
  const target=pathname===prefix||pathname.startsWith(prefix+"/")
    ?"/product/"+other+pathname.slice(prefix.length)
    :"/product/"+other;
  return <Link className="product-language-switch" href={target} hrefLang={other}
    lang={other} aria-label={locale==="ar"?"Switch to English":"التبديل إلى العربية"}>
    <span aria-hidden="true">◎</span>{locale==="ar"?"EN":"العربية"}
  </Link>;
}
