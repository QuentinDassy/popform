/**
 * Upload a file via the server-side API route (bypasses Supabase Storage RLS).
 * Returns the public URL of the uploaded file, or throws on error.
 */
export async function uploadImage(file: File, folder: string): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const slug = folder + "/" + Date.now() + "." + ext;

  const fd = new FormData();
  fd.append("file", file);
  fd.append("path", slug);

  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error || "Upload failed");
  return json.url as string;
}
