import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const state = vi.hoisted(() => ({ pathname: "/ar/pos" }));
vi.mock("next/navigation", () => ({
  usePathname: () => state.pathname,
  useRouter: () => ({ replace: () => {}, refresh: () => {}, push: () => {} }),
}));

import { AppShell } from "@/components/app-shell";

describe("A1 Mobi sidebar navigation", () => {
  for (const locale of ["ar", "en"] as const) {
    for (const page of ["pos", "products", "inventory", "settings/team"] as const) {
      it(`keeps all desktop sidebar links expanded when opening ${locale}/${page}`, () => {
        state.pathname = `/${locale}/${page}`;
        const html = renderToStaticMarkup(createElement(AppShell, {
          locale, live: true, children: createElement("main", null, "Workspace")
        }));
        expect(html).toContain('class="app-shell"');
        expect(html).not.toContain("sidebar-collapsed");
        expect(html).toContain(`href="/${locale}/pos"`);
        expect(html).toContain(`href="/${locale}/products"`);
        expect(html).toContain(`href="/${locale}/inventory"`);
        expect(html).toContain(`href="/${locale}/settings/team"`);
        expect(html).toContain(`href="/${locale}/account"`);
      });
    }
  }
});
