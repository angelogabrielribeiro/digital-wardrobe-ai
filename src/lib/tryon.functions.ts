import { createServerFn } from "@tanstack/react-start";

/**
 * Server-side proxy to FAL AI FASHN try-on.
 * SECURITY: FAL_KEY stays server-side (never shipped to the browser).
 * In production, keep this call on the backend — do NOT expose the key in VITE_* envs.
 */
export const generateTryOnLook = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { model_image: string; garment_image: string; category: "tops" | "bottoms" }) => {
      if (!input?.model_image) throw new Error("Envie uma foto do modelo.");
      if (!input?.garment_image) throw new Error("Envie a foto ou URL da peça.");
      if (!["tops", "bottoms"].includes(input.category)) throw new Error("Categoria inválida.");
      return input;
    },
  )
  .handler(async ({ data }) => {
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
      const t = await submit.text();
      throw new Error(`Falha ao enviar para a IA: ${t.slice(0, 180)}`);
    }
    const submitJson = (await submit.json()) as { request_id?: string; status_url?: string; response_url?: string };
    const requestId = submitJson.request_id;
    if (!requestId) throw new Error("Resposta inválida da IA.");

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
      if (sJson.status === "FAILED") throw new Error("A IA não conseguiu gerar o look. Tente outra imagem.");
    }

    // 3. Fetch result
    const r = await fetch(resultUrl, { headers: { Authorization: `Key ${key}` } });
    if (!r.ok) throw new Error("Não foi possível recuperar o resultado.");
    const json = (await r.json()) as { images?: Array<{ url: string }> };
    const url = json.images?.[0]?.url;
    if (!url) throw new Error("Nenhuma imagem retornada pela IA.");
    return { imageUrl: url };
  });
