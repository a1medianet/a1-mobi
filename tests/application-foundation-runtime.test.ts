import { afterEach, describe, expect, it } from "vitest";
import { appVersionInfo, compareVersions } from "@/core/version";
import { guideFallback } from "@/server/assist-client";
import { featureEnabled } from "@/server/billing-client";

const saved={
  version:process.env.A1_APP_VERSION,
  latest:process.env.A1_LATEST_VERSION,
  minimum:process.env.A1_MINIMUM_SUPPORTED_VERSION,
  build:process.env.A1_BUILD_SHA,
  channel:process.env.A1_RELEASE_CHANNEL,
};

afterEach(()=>{
  const pairs=[
    ["A1_APP_VERSION",saved.version],
    ["A1_LATEST_VERSION",saved.latest],
    ["A1_MINIMUM_SUPPORTED_VERSION",saved.minimum],
    ["A1_BUILD_SHA",saved.build],
    ["A1_RELEASE_CHANNEL",saved.channel],
  ] as const;
  for(const [key,value] of pairs){
    if(value===undefined)delete process.env[key];else process.env[key]=value;
  }
});

describe("Application Foundation runtime contracts",()=>{
  it("orders semantic release versions for update decisions",()=>{
    expect(compareVersions("1.2.3","1.2.3")).toBe(0);
    expect(compareVersions("1.2.4","1.2.3")).toBeGreaterThan(0);
    expect(compareVersions("1.1.9","1.2.0")).toBeLessThan(0);
  });

  it("marks below-minimum releases required and behind-latest releases recommended",()=>{
    process.env.A1_APP_VERSION="1.0.0";
    process.env.A1_LATEST_VERSION="1.2.0";
    process.env.A1_MINIMUM_SUPPORTED_VERSION="1.1.0";
    process.env.A1_BUILD_SHA="abc123";
    process.env.A1_RELEASE_CHANNEL="pilot";
    expect(appVersionInfo()).toMatchObject({version:"1.0.0",latest:"1.2.0",minimum:"1.1.0",updateState:"required",build:"abc123",channel:"pilot"});

    process.env.A1_APP_VERSION="1.1.0";
    expect(appVersionInfo().updateState).toBe("recommended");
    process.env.A1_APP_VERSION="1.2.0";
    expect(appVersionInfo().updateState).toBe("current");
  });

  it("falls back to the relevant AR/EN Guide section when Assist is unavailable",()=>{
    expect(guideFallback("كيف أضيف فرعًا جديدًا؟","ar").anchor).toBe("billing");
    expect(guideFallback("repair status workflow","en").anchor).toBe("repair");
    expect(guideFallback("inventory count","en").anchor).toBe("inventory");
  });

  it("treats only explicit true entitlements as enabled",()=>{
    const snapshot={tenantId:"mobi:test",productKey:"mobi",status:"trialing",features:{"pos.enabled":"true","reports.enabled":"false"}};
    expect(featureEnabled(snapshot,"pos.enabled")).toBe(true);
    expect(featureEnabled(snapshot,"reports.enabled")).toBe(false);
    expect(featureEnabled(snapshot,"missing")).toBe(false);
  });
});
