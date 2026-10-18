import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import manifest from "@/app/manifest";

const fromRoot=(path:string)=>resolve(process.cwd(),path);

describe("A1 Mobi approved brand identity",()=>{
 it("uses source-derived vector emblem and full wordmark with correct geometry",()=>{
  const full=readFileSync(fromRoot("public/brand/a1-mobi-logo.svg"),"utf8");
  const icon=readFileSync(fromRoot("public/brand/a1-mobi-icon.svg"),"utf8");
  expect(full).toContain('viewBox="81 37 1903 613"');
  expect(icon).toContain('viewBox="75 111 520 458"');
  expect(full).toContain('aria-label="A1 Mobi"');
  expect(full).toContain('fill-rule="evenodd"');
  expect(full).toContain("#ff7421");
  expect(full).toContain("#2060eb");
  expect(full).not.toMatch(/<script|(?:href|src)=["']https?:\/\//i);
 });
 it.each([
  ["src/app/icon.png",512,512],
  ["src/app/apple-icon.png",180,180],
  ["public/brand/icon-192.png",192,192],
  ["public/brand/icon-512.png",512,512]
 ])("renders %s at %ix%i without a network dependency",async (path,width,height)=>{
  const data=await sharp(fromRoot(path)).metadata();
  expect(data.width).toBe(width);
  expect(data.height).toBe(height);
  expect(data.format).toBe("png");
 });
 it("uses a pure-white full logo and a pure-white compact icon on dark surfaces",()=>{
  const original=readFileSync(fromRoot("public/brand/a1-mobi-logo.svg"),"utf8");
  const white=readFileSync(fromRoot("public/brand/a1-mobi-logo-white.svg"),"utf8");
  const icon=readFileSync(fromRoot("public/brand/a1-mobi-icon.svg"),"utf8");
  const whiteIcon=readFileSync(fromRoot("public/brand/a1-mobi-icon-white.svg"),"utf8");
  const whiten=(s:string)=>s.replace('fill="url(#b)"','fill="#ffffff"').replace('fill="url(#o)"','fill="#ffffff"');
  expect(white).toBe(whiten(original));
  expect(whiteIcon).toBe(whiten(icon));
  expect((white.match(/fill="#ffffff"/g)||[])).toHaveLength(2);
  expect((whiteIcon.match(/fill="#ffffff"/g)||[])).toHaveLength(2);
  const publicShell=readFileSync(fromRoot("src/components/product-site-shell.tsx"),"utf8");
  const ownerShell=readFileSync(fromRoot("src/components/app-shell.tsx"),"utf8");
  expect(publicShell).toContain('footer?"/brand/a1-mobi-logo-white.svg":"/brand/a1-mobi-logo.svg"');
  expect(ownerShell).toContain('src="/brand/a1-mobi-logo-white.svg"');
  expect(ownerShell).toContain('src="/brand/a1-mobi-icon-white.svg"');
  expect(ownerShell).not.toMatch(/<b>Mobi<\/b>|Store platform/);
 });
 it("keeps a valid binary ICO favicon with an embedded PNG",()=>{
  const ico=readFileSync(fromRoot("src/app/favicon.ico"));
  expect(ico.readUInt16LE(0)).toBe(0);
  expect(ico.readUInt16LE(2)).toBe(1);
  expect(ico.readUInt16LE(4)).toBe(1);
  expect(ico.readUInt32LE(18)).toBe(22);
  expect(ico.subarray(22,30).toString("hex")).toBe("89504e470d0a1a0a");
 });
 it("defines product branding, an official install icon, and no offline promises",()=>{
  const data=manifest();
  expect(data.name).toContain("A1 Mobi");
  expect(data.icons?.length).toBe(2);
  expect(data.icons?.[0]?.src).toBe("/brand/icon-192.png");
  expect(data.icons?.[1]?.src).toBe("/brand/icon-512.png");
  expect(data.start_url).toBe("/product/ar");
 });
});
