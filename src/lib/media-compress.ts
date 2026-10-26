/**
 * Opt-in client-side media compression for the outgoing chat payload.
 *
 * Scope rules (data-isolation constraint):
 *  - The toggle (`settings.compress_media`, default OFF) only affects the
 *    NETWORK payload sent to /api/chat. Attachments are always captured and
 *    displayed in their original form.
 *  - When compression applies, the wire entry carries BOTH the compressed
 *    `data_url` (forwarded to the model) and the untouched
 *    `original_data_url` (persisted to the DB by /api/chat), so
 *    blocks.content always keeps the original bytes.
 */

/** Images at or below this size are never touched (bytes). */
export const IMAGE_COMPRESS_THRESHOLD = 2 * 1024 * 1024;

/** Downscale cap applied to the image WIDTH (aspect ratio preserved). */
export const IMAGE_MAX_WIDTH = 1920;

/** JPEG re-encode quality used for the compressed wire copy. */
const COMPRESS_QUALITY = 0.85;

export interface AttachedFileLike {
  name: string;
  type: string;
  dataUrl: string;
  size: number;
}

export interface WireAttachment {
  data_url: string;
  mime_type: string;
  name: string;
  /** Present only when the wire copy was compressed; persisted verbatim to the DB. */
  original_data_url?: string;
}

/**
 * Recompress an image data URL in the browser: downscale to at most
 * IMAGE_MAX_WIDTH px wide and re-encode as JPEG. Returns null when the
 * input is not compressible or the result would not be smaller.
 */
export async function compressImageFile(
  dataUrl: string,
  originalSize: number
): Promise<{ dataUrl: string; type: string; size: number } | null> {
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const bitmap = await createImageBitmap(blob);
    try {
      const scale = Math.min(1, IMAGE_MAX_WIDTH / bitmap.width);
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(bitmap, 0, 0, w, h);
      const out: Blob | null = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", COMPRESS_QUALITY)
      );
      // Only use the recompressed version when it is actually smaller.
      if (!out || out.size >= originalSize) return null;
      const compressedUrl: string = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = () => reject(new Error("read failed"));
        r.readAsDataURL(out);
      });
      console.log(
        `[media-compress] Image compressed: ${(originalSize / 1048576).toFixed(2)}MB -> ${(out.size / 1048576).toFixed(2)}MB (${bitmap.width}x${bitmap.height} -> ${w}x${h})`
      );
      return { dataUrl: compressedUrl, type: "image/jpeg", size: out.size };
    } finally {
      bitmap.close();
    }
  } catch (err) {
    console.warn("[media-compress] Compression unavailable, sending original:", err);
    return null;
  }
}

/**
 * Build the attachments array for the /api/chat request body.
 *
 * With compression OFF (default) every file passes through untouched. With
 * compression ON, only images larger than IMAGE_COMPRESS_THRESHOLD are
 * recompressed; each compressed entry keeps the original under
 * `original_data_url` so the server can persist it unchanged.
 *
 * The compressor is injectable for tests.
 */
export async function buildWireAttachments(
  files: AttachedFileLike[],
  compressEnabled: boolean,
  compressor: (
    dataUrl: string,
    originalSize: number
  ) => Promise<{ dataUrl: string; type: string; size: number } | null> = compressImageFile
): Promise<WireAttachment[]> {
  const wire: WireAttachment[] = [];
  for (const f of files) {
    const entry: WireAttachment = { data_url: f.dataUrl, mime_type: f.type, name: f.name };
    if (compressEnabled && f.type.startsWith("image/") && f.size > IMAGE_COMPRESS_THRESHOLD) {
      const compressed = await compressor(f.dataUrl, f.size);
      if (compressed) {
        entry.data_url = compressed.dataUrl;
        entry.mime_type = compressed.type;
        entry.original_data_url = f.dataUrl;
      }
    }
    wire.push(entry);
  }
  return wire;
}
