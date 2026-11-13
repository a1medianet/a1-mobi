import sharp from "sharp";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
const root=resolve(".");
const source=resolve(root,"public/brand/a1-mobi-icon.svg");
const output=async(name,width,background)=> {
 const img=sharp(source,{density:400}).resize(width,width,{fit:"contain",background:"#00000000"});
 const bytes=background?await img.flatten({background}).png().toBuffer():await img.png().toBuffer();
 await writeFile(resolve(root,name),bytes);
 console.log("BRAND_ASSET_OK",name,bytes.length,width);
 return bytes;
};
await mkdir(resolve(root,"public/brand"),{recursive:true});
await output("src/app/icon.png",512);
await output("src/app/apple-icon.png",180,"#ffffff");
await output("public/brand/icon-192.png",192);
await output("public/brand/icon-512.png",512);
const favicon=await output("public/brand/icon-64.png",64);
const header=Buffer.alloc(22);
header.writeUInt16LE(0,0);header.writeUInt16LE(1,2);header.writeUInt16LE(1,4);
header.writeUInt8(64,6);header.writeUInt8(64,7);header.writeUInt16LE(1,10);
header.writeUInt16LE(32,12);header.writeUInt32LE(favicon.length,14);
header.writeUInt32LE(22,18);
await writeFile(resolve(root,"src/app/favicon.ico"),Buffer.concat([header,favicon]));
console.log("BRAND_FAVICON_OK",favicon.length+22);
const brandSvg=await readFile(resolve(root,"public/brand/a1-mobi-logo.svg"),"utf8");
if(!brandSvg.includes('viewBox="81 37 1903 613"')) throw new Error("Logo SVG source mismatch");
// Preserve the exact logo vector and orange mark; replace only blue glyph fill.
// No image tracing, no alternate typography, no client-specific logo changes.
const negative=brandSvg.replace('fill="url(#b)"','fill="#ffffff"');
if(negative===brandSvg)throw new Error("Expected blue logo vector not found");
await writeFile(resolve(root,"public/brand/a1-mobi-logo-on-dark.svg"),negative);
const monochrome=negative.replace('fill="url(#o)"','fill="#ffffff"');
if(monochrome===negative)throw new Error("Expected orange vector not found");
await writeFile(resolve(root,"public/brand/a1-mobi-logo-white.svg"),monochrome);
console.log("BRAND_PRIMARY_LOGO_OK",brandSvg.length);
console.log("BRAND_NEGATIVE_WHITE_LOGO_OK",negative.length);
console.log("BRAND_MONOCHROME_WHITE_LOGO_OK",monochrome.length);
