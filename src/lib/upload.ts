import { supabase } from "@/integrations/supabase/client";

const BUCKET = "product-images";
// Signed URL valid for 10 years (covers MVP; refresh on read if needed).
const SIGN_EXPIRES = 60 * 60 * 24 * 365 * 10;

export async function uploadProductImage(file: File): Promise<string> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  const uid = userData.user?.id;
  if (!uid) throw new Error("Sessão expirada.");
  if (file.size > 8 * 1024 * 1024) throw new Error("Imagem muito grande (máx. 8MB).");
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${uid}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (upErr) throw upErr;
  const { data: signed, error: sErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGN_EXPIRES);
  if (sErr) throw sErr;
  return signed.signedUrl;
}
