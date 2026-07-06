import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

const MAX_IMAGE_STRING = 15 * 1024 * 1024; // ~15 MB of base64/URL string

function validateGarment(input: string): void {
  if (input.length > MAX_IMAGE_STRING) {
    throw new Error("Imagem da peça muito grande.");
  }
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
    throw new Error("Link da peça inválido. Use https.");
  }
}

function validateModel(input: string): void {
  if (input.length > MAX_IMAGE_STRING) {
    throw new Error("Sua foto está muito grande (máx. ~10 MB).");
  }
  if (!input.startsWith("data:image/")) {
    throw new Error("Foto do modelo inválida.");
  }
  if (!/^data:image\/(png|jpe?g|webp);base64,/i.test(input)) {
    throw new Error("Formato de foto inválido. Use PNG, JPG ou WEBP.");
  }
}

/**
 * Server-side proxy to FAL AI FASHN try-on.
 * SECURITY: FAL_KEY stays server-side (never shipped to the browser).
 * Defence-in-depth: same-origin check + strict input size/format limits
 * to prevent third parties from burning FAL API credits.
 */
export const generateTryOnLook = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { model_image: string; garment_image: string; category: "tops" | "bottoms" }) => {
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
      // If getRequest fails for any reason, fail closed.
      throw new Error("Requisição não autorizada.");
    }

    const key = process.env.FAL_KEY;
    if (!key) throw new Error("FAL_KEY não configurada.");

    // 1. Enqueue
    const submit = await fetch("https://queue.fal.run/fal-ai/fashn/tryon/v1.6", {
      method: "POST",
      headers: {
        Authorization: `Key ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model_image: data.model_image,
        garment_image: data.garment_image,
        category: data.category,
      }),
    });

    if (!submit.ok) {
      throw new Error("Falha ao enviar para o serviço de try-on.");
    }
    const submitJson = (await submit.json()) as { request_id?: string; status_url?: string; response_url?: string };
    const requestId = submitJson.request_id;
    if (!requestId) throw new Error("Resposta inválida do serviço.");

    const statusUrl = submitJson.status_url ?? `https://queue.fal.run/fal-ai/fashn/requests/${requestId}/status`;
    const resultUrl = submitJson.response_url ?? `https://queue.fal.run/fal-ai/fashn/requests/${requestId}`;

    // 2. Poll (max ~90s)
    const started = Date.now();
    while (Date.now() - started < 90_000) {
      await new Promise((r) => setTimeout(r, 2000));
      const s = await fetch(statusUrl, { headers: { Authorization: `Key ${key}` } });
      if (!s.ok) continue;
      const sJson = (await s.json()) as { status?: string };
      if (sJson.status === "COMPLETED") break;
      if (sJson.status === "FAILED") throw new Error("Não foi possível gerar o look. Tente outra imagem.");
    }

    // 3. Fetch result
    const r = await fetch(resultUrl, { headers: { Authorization: `Key ${key}` } });
    if (!r.ok) throw new Error("Não foi possível recuperar o resultado.");
    const json = (await r.json()) as { images?: Array<{ url: string }> };
    const url = json.images?.[0]?.url;
    if (!url) throw new Error("Nenhuma imagem retornada.");
    return { imageUrl: url };
  });
