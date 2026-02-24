/**
 * Upload a file directly via the authenticated Supabase browser client.
 * Falls back to /api/upload server route if direct upload fails.
 */
export async function uploadImage(file: File, folder: string): Promise<string> {
  // Normalize: iOS HEIC photos arrive with empty type or heic extension
  const contentType = file.type || "image/jpeg";
  const rawExt = file.name.split(".").pop()?.toLowerCase() || "";
  const ext = (rawExt === "heic" || rawExt === "heif" || !rawExt)
    ? (contentType.includes("png") ? "png" : contentType.includes("gif") ? "gif" : contentType.includes("webp") ? "webp" : "jpg")
    : rawExt;
  const slug = folder + "/" + Date.now() + "." + ext;

  // First try: direct client upload with user session (bypasses RLS issues)
  try {
    const { createClient } = await import("@/lib/supabase");
    const supabase = createClient();
    
    // Find the right bucket
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucket = buckets?.find((b: { name: string }) => b.name.toLowerCase() === "images") || buckets?.[0];
    
    if (bucket) {
      const { error, data } = await supabase.storage
        .from(bucket.name)
        .upload(slug, file, { contentType, upsert: true });
      
      if (!error && data) {
        const { data: urlData } = supabase.storage.from(bucket.name).getPublicUrl(slug);
        return urlData.publicUrl;
      }
    }
  } catch (_) {}

  // Fallback: server route
  const fd = new FormData();
  fd.append("file", file);
  fd.append("path", slug);

  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error || "Upload failed");
  return json.url as string;
}
