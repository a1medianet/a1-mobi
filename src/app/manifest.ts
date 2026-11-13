import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id:"/product/ar",
    name:"A1 Mobi — Mobile Retail & Repair OS",
    short_name:"A1 Mobi",
    description:"Mobile retail, inventory and repair operations",
    start_url:"/product/ar",
    scope:"/",
    display:"standalone",
    background_color:"#ffffff",
    theme_color:"#1265e8",
    icons:[
      {src:"/brand/icon-192.png",sizes:"192x192",type:"image/png",purpose:"any"},
      {src:"/brand/icon-512.png",sizes:"512x512",type:"image/png",purpose:"any"}
    ]
  };
}
