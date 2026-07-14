import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

const MAX_IMAGE_STRING = 15 * 1024 * 1024;
const ALLOWED_MODEL_MIME = /^data:image\/(png|jpe?g|webp);base64,/i;
const ALLOWED_REMOTE_MIME = /^image\/(png|jpe?g|webp)$/i;

/* ─────────────── Input validators ─────────────── */

function validateModel(input: string): void {
  if (input.length > MAX_IMAGE_STRING) throw new Error("Sua foto está muito grande (máx. ~10 MB).");
  if (!ALLOWED_MODEL_MIME.test(input)) throw new Error("Formato de foto inválido. Use PNG, JPG ou WEBP.");
}

function validateGarment(input: string): void {
  if (input.length > MAX_IMAGE_STRING) throw new Error("Imagem da peça muito grande.");
  if (input.startsWith("data:")) {
    if (!/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(input)) {
      throw new Error("Formato de imagem inválido.");
    }
    return;
  }
  try {
    const u = new URL(input);
    if (u.protocol !== "https:") throw new Error();
  } catch {
    throw new Error("Link da peça inválido.");
  }
}

/**
 * Best-effort SSRF guard — blocks obvious local/private hostnames before we
 * hand a URL to fetch(). We do not resolve DNS on the worker; edge platforms
 * generally block the metadata IP ranges anyway.
 */
function assertPublicHost(url: URL): void {
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host === "0.0.0.0" || host.endsWith(".localhost")) {
    throw new Error("URL não permitida.");
  }
  if (/^(10\.|127\.|169\.254\.|192\.168\.)/.test(host)) throw new Error("URL não permitida.");
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) throw new Error("URL não permitida.");
  if (host === "::1" || host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd")) {
    throw new Error("URL não permitida.");
  }
}

/**
 * Verify a garment URL points to a direct image (JPG/PNG/WEBP) and not to
 * a product / HTML page. Throws a human-readable error otherwise.
 */
async function verifyGarmentIsDirectImage(rawUrl: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Link da peça inválido.");
  }
  if (url.protocol !== "https:") throw new Error("Use um link https válido.");
  assertPublicHost(url);

  const NOT_IMAGE = "Esse link abre uma página, não uma imagem da peça. Envie a foto ou cole o endereço direto da imagem.";

  const checkHeaders = (res: Response): { ok: boolean; ct: string } => {
    const ct = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    return { ok: ALLOWED_REMOTE_MIME.test(ct), ct };
  };

  // Try HEAD first — many CDNs support it.
  try {
    const head = await fetch(url.toString(), { method: "HEAD", redirect: "follow" });
    if (head.ok) {
      const { ok } = checkHeaders(head);
      if (ok) return;
      // Some CDNs answer HEAD without a proper content-type; fall through to GET.
    }
  } catch {
    // fall through to GET
  }

  // Range GET fallback — 4 KB is enough to inspect the content-type.
  const get = await fetch(url.toString(), {
    method: "GET",
    headers: { Range: "bytes=0-4095" },
    redirect: "follow",
  });
  if (!get.ok && get.status !== 206) throw new Error("Não conseguimos acessar essa imagem.");
  const { ok } = checkHeaders(get);
  // Consume+discard body to release the connection.
  try { await get.arrayBuffer(); } catch { /* noop */ }
  if (!ok) throw new Error(NOT_IMAGE);
}

/* ─────────────── FAL helpers ─────────────── */

const FAL_ENDPOINT = "https://queue.fal.run/fal-ai/fashn/tryon/v1.6";

type FalSubmit = { request_id: string; status_url: string; response_url: string };

function requireFalKey(): string {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("Serviço de try-on indisponível.");
  return key;
}

async function falSubmit(
  key: string,
  body: { model_image: string; garment_image: string; category: "tops" | "bottoms" },
): Promise<FalSubmit> {
  const res = await fetch(FAL_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 402 || /credit|balance/i.test(text)) {
      throw new Error("Créditos do provador esgotados. Tente novamente mais tarde.");
    }
    if (res.status === 400 || res.status === 422) {
      throw new Error("A imagem enviada não pôde ser processada. Tente outra.");
    }
    throw new Error("Falha ao enviar para o serviço de try-on.");
  }
  const j = (await res.json()) as Partial<FalSubmit>;
  if (!j.request_id) throw new Error("Resposta inválida do serviço.");
  return {
    request_id: j.request_id,
    status_url: j.status_url ?? `https://queue.fal.run/fal-ai/fashn/requests/${j.request_id}/status`,
    response_url: j.response_url ?? `https://queue.fal.run/fal-ai/fashn/requests/${j.request_id}`,
  };
}

async function falStatus(key: string, requestId: string): Promise<"IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "UNKNOWN"> {
  const url = `https://queue.fal.run/fal-ai/fashn/requests/${requestId}/status`;
  const res = await fetch(url, { headers: { Authorization: `Key ${key}` } });
  if (!res.ok) return "UNKNOWN";
  const j = (await res.json()) as { status?: string };
  const s = (j.status ?? "").toUpperCase();
  if (s === "IN_QUEUE" || s === "IN_PROGRESS" || s === "COMPLETED" || s === "FAILED") return s;
  return "UNKNOWN";
}

async function falResult(key: string, requestId: string): Promise<string | null> {
  const url = `https://queue.fal.run/fal-ai/fashn/requests/${requestId}`;
  for (let i = 0; i < 3; i++) {
    const res = await fetch(url, { headers: { Authorization: `Key ${key}` } });
    if (res.ok) {
      const j = (await res.json()) as { images?: Array<{ url: string }> };
      const img = j.images?.[0]?.url;
      if (img) return img;
    }
    await new Promise((r) => setTimeout(r, 500 * (i + 1)));
  }
  return null;
}

/**
 * Wait for a FAL request to reach a terminal state, then fetch the result.
 * Never issues a new submission — safe to call multiple times for the same
 * request_id (recovery path).
 */
async function pollAndFetch(key: string, requestId: string, timeoutMs: number): Promise<string> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const status = await falStatus(key, requestId);
    if (status === "COMPLETED") {
      const url = await falResult(key, requestId);
      if (!url) throw new Error("__PENDING__");
      return url;
    }
    if (status === "FAILED") throw new Error("__FAILED__");
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("__PENDING__");
}

/* ─────────────── Storage / persistence helpers ─────────────── */

function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; contentType: string; ext: string } {
  const m = dataUrl.match(/^data:(image\/(png|jpe?g|webp));base64,(.+)$/i);
  if (!m) throw new Error("Foto inválida.");
  const contentType = m[1].toLowerCase();
  const ext = contentType === "image/jpeg" ? "jpg" : contentType.split("/")[1];
  const bin = atob(m[3]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { bytes, contentType, ext };
}

function assertSameOrigin(): void {
  try {
    const req = getRequest();
    const origin = req.headers.get("origin");
    const referer = req.headers.get("referer");
    const host = req.headers.get("host");
    const allowed = host?.toLowerCase();
    const fromAllowed = (v: string | null) => {
      if (!v) return false;
      try { return new URL(v).host.toLowerCase() === allowed; } catch { return false; }
    };
    if (!allowed || (!fromAllowed(origin) && !fromAllowed(referer))) {
      throw new Error("Requisição não autorizada.");
    }
  } catch (err) {
    if (err instanceof Error && err.message === "Requisição não autorizada.") throw err;
    throw new Error("Requisição não autorizada.");
  }
}

/* ─────────────── Server functions ─────────────── */

/**
 * Submit a new try-on generation.
 *  - Validates model + garment inputs (rejects HTML links before touching FAL).
 *  - Persists an experiments row keyed by fal_request_id BEFORE polling so we
 *    can recover the same result later without paying twice.
 *  - Polls and returns the final image URL.
 *
 * If polling / result fetch fails transiently, the client can call
 * `recoverTryOn` with the returned request_id — no new submission is created.
 */
export const generateTryOnLook = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      token?: string;
      model_image: string;
      garment_image: string;
      category: "tops" | "bottoms";
    }) => {
      if (!input?.model_image) throw new Error("Envie uma foto do modelo.");
      if (!input?.garment_image) throw new Error("Envie a foto ou URL da peça.");
      if (!["tops", "bottoms"].includes(input.category)) throw new Error("Categoria inválida.");
      validateModel(input.model_image);
      validateGarment(input.garment_image);
      return input;
    },
  )
  .handler(async ({ data }) => {
    assertSameOrigin();

    // Reject HTML links BEFORE incurring any FAL cost.
    if (!data.garment_image.startsWith("data:")) {
      await verifyGarmentIsDirectImage(data.garment_image);
    }

    const key = requireFalKey();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Resolve product (when tokenised) so we can persist per-store analytics.
    let product: { id: string; store_id: string } | null = null;
    if (data.token) {
      const { data: qr, error } = await supabaseAdmin
        .from("qrcodes")
        .select("product_id, products!inner(id, store_id, status)")
        .eq("token", data.token)
        .maybeSingle();
      if (error) throw new Error("Não foi possível localizar a peça.");
      const p = qr?.products as { id: string; store_id: string; status: string } | null;
      if (!p || p.status !== "pronto") throw new Error("Peça indisponível.");
      product = { id: p.id, store_id: p.store_id };
    }

    // Optional archival upload of the input photo.
    let inputPath: string | null = null;
    if (product) {
      try {
        const { bytes, contentType, ext } = dataUrlToBytes(data.model_image);
        const path = `${product.store_id}/${product.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabaseAdmin.storage
          .from("tryon-uploads")
          .upload(path, bytes, { contentType, upsert: false });
        if (!error) inputPath = path;
      } catch { /* non-blocking */ }
    }

    // 1) Submit to FAL.
    const submitted = await falSubmit(key, {
      model_image: data.model_image,
      garment_image: data.garment_image,
      category: data.category,
    });
    const requestId = submitted.request_id;

    // 2) Persist experiment IMMEDIATELY (before polling) so a crash doesn't
    // leave us paying twice on retry.
    if (product) {
      try {
        await supabaseAdmin.from("experiments").insert({
          product_id: product.id,
          store_id: product.store_id,
          input_url: inputPath,
          fal_request_id: requestId,
          status: "processing",
        });
      } catch { /* analytics-only, ignore */ }
    }

    // 3) Poll + fetch (may throw __PENDING__ or __FAILED__).
    try {
      const imageUrl = await pollAndFetch(key, requestId, 90_000);
      if (product) {
        try {
          await supabaseAdmin
            .from("experiments")
            .update({ status: "completed", result_url: imageUrl })
            .eq("fal_request_id", requestId);
        } catch { /* ignore */ }
      }
      return { imageUrl, requestId };
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      if (code === "__FAILED__") {
        if (product) {
          try {
            await supabaseAdmin
              .from("experiments")
              .update({ status: "failed", error_message: "fal_failed" })
              .eq("fal_request_id", requestId);
          } catch { /* ignore */ }
        }
        throw new Error("Não foi possível gerar o look. Tente outra imagem.");
      }
      // __PENDING__ — expose requestId so the client can recover without paying.
      throw Object.assign(new Error("__PENDING__"), { requestId });
    }
  });

/**
 * Recover the result for an existing FAL request WITHOUT creating a new
 * submission. Safe to call multiple times — never spends credits.
 */
export const recoverTryOnLook = createServerFn({ method: "POST" })
  .inputValidator((input: { requestId: string }) => {
    if (!input?.requestId || typeof input.requestId !== "string" || input.requestId.length > 128) {
      throw new Error("Identificador inválido.");
    }
    return input;
  })
  .handler(async ({ data }) => {
    assertSameOrigin();
    const key = requireFalKey();

    try {
      const imageUrl = await pollAndFetch(key, data.requestId, 45_000);
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin
          .from("experiments")
          .update({ status: "completed", result_url: imageUrl })
          .eq("fal_request_id", data.requestId);
      } catch { /* ignore */ }
      return { imageUrl };
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      if (code === "__FAILED__") throw new Error("Não foi possível gerar o look. Tente outra imagem.");
      throw new Error("Seu resultado ainda está sendo finalizado. Tente novamente em instantes.");
    }
  });
