import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

const MAX_IMAGE_STRING = 15 * 1024 * 1024; // ~15 MB base64/URL string
const ALLOWED_MIME = /^data:image\/(png|jpe?g|webp);base64,/i;

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

function validateModel(input: string): void {
  if (input.length > MAX_IMAGE_STRING) {
    throw new Error("Sua foto está muito grande (máx. ~10 MB).");
  }
  if (!ALLOWED_MIME.test(input)) {
    throw new Error("Formato de foto inválido. Use PNG, JPG ou WEBP.");
  }
}

function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; contentType: string; ext: string } {
  const match = dataUrl.match(/^data:(image\/(png|jpe?g|webp));base64,(.+)$/i);
  if (!match) throw new Error("Foto inválida.");
  const contentType = match[1].toLowerCase();
  const ext = contentType === "image/jpeg" ? "jpg" : contentType.split("/")[1];
  const base64 = match[3];
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { bytes, contentType, ext };
}

/**
 * Server-side proxy to FAL AI FASHN try-on.
 * SECURITY:
 *  - FAL_KEY stays server-side.
 *  - Same-origin check as defence-in-depth.
 *  - Strict input size/format validation.
 *  - Persists experiment via service-role client after successful generation.
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
    // Same-origin check (defence-in-depth against cross-site credit abuse).
    try {
      const req = getRequest();
      const origin = req.headers.get("origin");
      const referer = req.headers.get("referer");
      const host = req.headers.get("host");
      const allowedHost = host?.toLowerCase();
      const fromAllowed = (value: string | null) => {
        if (!value) return false;
        try {
          return new URL(value).host.toLowerCase() === allowedHost;
        } catch {
          return false;
        }
      };
      if (!allowedHost || (!fromAllowed(origin) && !fromAllowed(referer))) {
        throw new Error("Requisição não autorizada.");
      }
    } catch (err) {
      if (err instanceof Error && err.message === "Requisição não autorizada.") throw err;
      throw new Error("Requisição não autorizada.");
    }

    const key = process.env.FAL_KEY;
    if (!key) throw new Error("Serviço de try-on indisponível.");

    // Resolve product + store from token via admin client (bypasses RLS on qrcodes).
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: qr, error: qrErr } = await supabaseAdmin
      .from("qrcodes")
      .select("product_id, products!inner(id, store_id, status)")
      .eq("token", data.token)
      .maybeSingle();
    if (qrErr) throw new Error("Não foi possível localizar a peça.");
    const product = qr?.products as { id: string; store_id: string; status: string } | null;
    if (!product || product.status !== "pronto") throw new Error("Peça indisponível.");

    // 1. Upload input photo to storage for later analytics.
    let inputUrl: string | null = null;
    try {
      const { bytes, contentType, ext } = dataUrlToBytes(data.model_image);
      const path = `${product.store_id}/${product.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabaseAdmin.storage
        .from("tryon-uploads")
        .upload(path, bytes, { contentType, upsert: false });
      if (!upErr) inputUrl = path;
    } catch {
      // Non-blocking — try-on continues even if archival upload fails.
    }

    // 2. Enqueue FAL request.
    const submit = await fetch("https://queue.fal.run/fal-ai/fashn/tryon/v1.6", {
      method: "POST",
      headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model_image: data.model_image,
        garment_image: data.garment_image,
        category: data.category,
      }),
    });
    if (!submit.ok) {
      const text = await submit.text().catch(() => "");
      if (submit.status === 402 || /credit|balance/i.test(text)) {
        throw new Error("Créditos do provador esgotados. Tente novamente mais tarde.");
      }
      throw new Error("Falha ao enviar para o serviço de try-on.");
    }
    const submitJson = (await submit.json()) as {
      request_id?: string;
      status_url?: string;
      response_url?: string;
    };
    const requestId = submitJson.request_id;
    if (!requestId) throw new Error("Resposta inválida do serviço.");
    const statusUrl =
      submitJson.status_url ?? `https://queue.fal.run/fal-ai/fashn/requests/${requestId}/status`;
    const resultUrl =
      submitJson.response_url ?? `https://queue.fal.run/fal-ai/fashn/requests/${requestId}`;

    // 3. Poll status (max ~90s).
    const started = Date.now();
    let completed = false;
    while (Date.now() - started < 90_000) {
      await new Promise((r) => setTimeout(r, 2000));
      const s = await fetch(statusUrl, { headers: { Authorization: `Key ${key}` } });
      if (!s.ok) continue;
      const sJson = (await s.json()) as { status?: string };
      if (sJson.status === "COMPLETED") {
        completed = true;
        break;
      }
      if (sJson.status === "FAILED") {
        throw new Error("Não foi possível gerar o look. Tente outra imagem.");
      }
    }
    if (!completed) throw new Error("O processamento demorou demais. Tente novamente.");

    // 4. Fetch result image.
    const r = await fetch(resultUrl, { headers: { Authorization: `Key ${key}` } });
    if (!r.ok) throw new Error("Não foi possível recuperar o resultado.");
    const json = (await r.json()) as { images?: Array<{ url: string }> };
    const imageUrl = json.images?.[0]?.url;
    if (!imageUrl) throw new Error("Nenhuma imagem retornada.");

    // 5. Persist experiment (non-blocking on failure — user still gets result).
    try {
      await supabaseAdmin.from("experiments").insert({
        product_id: product.id,
        store_id: product.store_id,
        input_url: inputUrl,
        result_url: imageUrl,
      });
    } catch {
      // Ignore analytics write failures.
    }

    return { imageUrl };
  });
