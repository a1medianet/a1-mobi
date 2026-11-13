import Link from "next/link";
export function OperationalJourney({locale,active}:{locale:"ar"|"en";active:"products"|"inventory"|"pos"}) {
  const ar=locale==="ar";
  const items=[
    {key:"products",route:"products",ar:"1. المنتجات",en:"1. Products",descAr:"تعريف الصنف وسعره",descEn:"Product and price"},
    {key:"inventory",route:"inventory",ar:"2. المخزون والأجهزة",en:"2. Inventory",descAr:"استلام الكمية أو IMEI",descEn:"Receive stock / IMEI"},
    {key:"pos",route:"pos",ar:"3. نقطة البيع",en:"3. Point of sale",descAr:"بيع وفاتورة مسجّلة",descEn:"Sell and invoice"},
  ] as const;
  return <nav className="mobi-operations-journey" aria-label={ar?"رحلة المنتج حتى الفاتورة":"Product to invoice workflow"}>
    {items.map(item=><Link key={item.key} href={"/"+locale+"/"+item.route}
      aria-current={active===item.key?"step":undefined} className={"mobi-journey-link"+(active===item.key?" is-current":"")}>
      <strong>{ar?item.ar:item.en}</strong><small>{ar?item.descAr:item.descEn}</small>
    </Link>)}
  </nav>;
}
