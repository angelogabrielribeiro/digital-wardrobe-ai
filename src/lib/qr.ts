import QRCode from "qrcode";

export function tryOnUrl(token: string, origin?: string): string {
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/try-on/${token}`;
}

export async function generateQrDataUrl(token: string): Promise<string> {
  return QRCode.toDataURL(tryOnUrl(token), {
    margin: 1,
    width: 512,
    color: { dark: "#0a0a0c", light: "#ffffff" },
  });
}

export async function downloadQr(token: string, filename: string): Promise<void> {
  const dataUrl = await generateQrDataUrl(token);
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `${filename}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
