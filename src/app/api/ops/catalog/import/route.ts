import { Prisma } from "@prisma/client";
import { authJson, currentStoreContext, sameOriginMutation } from "@/server/auth-http";
import { controlError } from "@/server/control-http";
import { productXlsxToCsv } from "@/modules/reports/excel-import";
import { importProductsCsv } from "@/modules/reports/product-import";

export const dynamic = "force-dynamic";
const MAX_FILE_BYTES = 1_000_000;

export async function POST(request: Request) {
  if (!sameOriginMutation(request)) return authJson({ error: "FORBIDDEN_ORIGIN" }, 403);
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data")) {
    return authJson({ error: "INVALID_IMPORT_FORMAT" }, 400);
  }
  if (Number(request.headers.get("content-length") ?? 0) > 1_500_000) {
    return authJson({ error: "IMPORT_TOO_LARGE" }, 413);
  }

  try {
    const ctx = await currentStoreContext("foundation.manage");
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return authJson({ error: "FILE_REQUIRED" }, 400);
    if (!file.size || file.size > MAX_FILE_BYTES) return authJson({ error: "IMPORT_TOO_LARGE" }, 413);
    const filename = file.name.toLowerCase();
    if (!filename.endsWith(".csv") && !filename.endsWith(".xlsx")) {
      return authJson({ error: "CSV_OR_XLSX_REQUIRED" }, 415);
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const csv = filename.endsWith(".xlsx")
      ? await productXlsxToCsv(bytes)
      : new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^\uFEFF/, "");

    const result = await importProductsCsv({ tenantId: ctx.tenantId, actorId: ctx.actorId, csv });
    return authJson({ ...result }, 200);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return authJson({ error: "IMPORT_CONFLICT" }, 409);
    }
    if (error instanceof Error && error.message === "Barcode already belongs to another product") {
      return authJson({ error: "BARCODE_ALREADY_ASSIGNED" }, 409);
    }
    if (error instanceof Error && /^(Missing import column|Invalid |Minimum price|Product import|Missing required|Duplicate |INVALID_|IDENTIFIER_)/.test(error.message)) {
      return authJson({ error: "INVALID_IMPORT_DATA" }, 422);
    }
    return controlError(error);
  }
}
