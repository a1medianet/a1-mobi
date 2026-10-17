import { StorePreviewExperience } from "@/components/store-preview-controls";
import { demoProducts, demoStore } from "@/demo/data";

export default function CustomerStorePreview(){
  const products=[
    ...demoProducts.filter(product=>product.type==="DEVICE"),
    ...demoProducts.filter(product=>product.type==="ACCESSORY").slice(0,4),
  ];
  return <StorePreviewExperience
    products={products}
    branchAr={demoStore.branchAr}
    branchEn={demoStore.branchEn}
  />;
}
