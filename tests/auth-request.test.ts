import { expect, it } from "vitest";
import { readAuthJson } from "@/core/auth/request";
it("limits streamed bytes without trusting Content-Length and rejects malformed JSON", async () => {
  const request = (body: string) => new Request("https://example.test", {
    method: "POST", body, headers: { "content-length": "1" },
  });
  expect(await readAuthJson(request('{"ok":true}'))).toEqual({ ok: true });
  await expect(readAuthJson(request(" ".repeat(4097)))).rejects.toThrow("INVALID_REQUEST");
  await expect(readAuthJson(request("invalid"))).rejects.toThrow();
  const multibyte = request(JSON.stringify("أ".repeat(2200)));
  await expect(readAuthJson(multibyte)).rejects.toThrow("INVALID_REQUEST");
});
