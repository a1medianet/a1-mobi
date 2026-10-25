import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/ops/catalog/import/route";
import { importProductsCsv } from "@/modules/reports/product-import";
import { currentStoreContext, sameOriginMutation } from "@/server/auth-http";

vi.mock("@/server/auth-http", () => ({
  sameOriginMutation: vi.fn(() => true),
  currentStoreContext: vi.fn(async () => ({ tenantId: "tenant-test", actorId: "owner-test" })),
  authJson: (body: unknown, status = 200) => Response.json(body, { status }),
}));
vi.mock("@/server/control-http", () => ({
  controlError: () => Response.json({ error: "UNEXPECTED" }, { status: 500 }),
}));
vi.mock("@/modules/reports/product-import", () => ({
  importProductsCsv: vi.fn(async () => ({ created: 1, updated: 0, total: 1 })),
}));

function request(name: string, content: string | Uint8Array) {
  const form = new FormData();
  form.set("file", new File([typeof content === "string" ? content : new Uint8Array(content)], name));
  return new Request("http://localhost/api/ops/catalog/import", { method: "POST", body: form });
}

describe("authenticated product bulk import HTTP route", () => {
  beforeEach(() => {
    vi.mocked(sameOriginMutation).mockReturnValue(true);
    vi.mocked(importProductsCsv).mockClear();
  });

  it("imports a CSV only through owner-authorized tenant scope", async () => {
    const response = await POST(request("products.csv", "header,data\nx,y"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ created: 1, total: 1 });
    expect(currentStoreContext).toHaveBeenCalledWith("foundation.manage");
    expect(importProductsCsv).toHaveBeenCalledWith({
      tenantId: "tenant-test", actorId: "owner-test", csv: "header,data\nx,y",
    });
  });

  it("refuses unsupported extensions, oversized uploads and foreign origins", async () => {
    expect((await POST(request("products.xlsm", "macro"))).status).toBe(415);
    expect((await POST(request("products.csv", new Uint8Array(1_000_001)))).status).toBe(413);
    vi.mocked(sameOriginMutation).mockReturnValueOnce(false);
    expect((await POST(request("products.csv", "header,data\nx,y"))).status).toBe(403);
    expect(importProductsCsv).not.toHaveBeenCalled();
  });
});
