import { afterEach, describe, expect, it, vi } from "vitest";
import RepairsPage from "@/app/[locale]/repairs/page";
import RepairLivePage from "@/components/repair-live-operations";
import LiveAliasPage from "@/app/[locale]/live-02/page";

afterEach(() => vi.unstubAllEnvs());

describe("canonical repairs navigation stage gate", () => {
  it.each(["ar", "en"])("reuses the live repairs screen at /%s/repairs when explicitly enabled", async locale => {
    vi.stubEnv("A1_MOBI_C_LIVE_02_ENABLED", "1");
    const page = await RepairsPage({ params: Promise.resolve({ locale }) });
    expect(page.type).toBe(RepairLivePage);
    expect(page.props.backToDashboard).toBe(true);
    expect(LiveAliasPage().type).toBe(RepairLivePage);
  });

  it.each(["ar", "en"])("keeps /%s/repairs in explicitly labelled demo mode when disabled", async locale => {
    vi.stubEnv("A1_MOBI_C_LIVE_02_ENABLED", "0");
    const page = await RepairsPage({ params: Promise.resolve({ locale }) });
    expect(page.type).toBe("main");
    expect(page.props.className).toBe("module-page");
    expect(() => LiveAliasPage()).toThrow();
  });

  it("rejects an unsupported locale even when the live gate is enabled", async () => {
    vi.stubEnv("A1_MOBI_C_LIVE_02_ENABLED", "1");
    await expect(RepairsPage({ params: Promise.resolve({ locale: "fr" }) })).rejects.toThrow();
  });
});
