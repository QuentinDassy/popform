import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const path = formData.get("path") as string | null;

    if (!file || !path) {
      return NextResponse.json({ error: "Missing file or path" }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    if (!url) return NextResponse.json({ error: "Missing NEXT_PUBLIC_SUPABASE_URL" }, { status: 500 });

    // Use service role if available, fall back to anon
    const supabase = createClient(url, serviceKey || anonKey, {
      auth: { persistSession: false },
    });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Try bucket "Images" first, then "images" (Supabase is case-sensitive)
    for (const bucket of ["Images", "images", "public"]) {
      const { error, data } = await supabase.storage
        .from(bucket)
        .upload(path, buffer, { contentType: file.type, upsert: true });

      if (!error) {
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
        return NextResponse.json({ url: urlData.publicUrl });
      }

      // If bucket not found, try next; if RLS/auth error, stop and report
      if (!error.message.includes("not found") && !error.message.includes("Bucket not found")) {
        console.error(`Upload error (bucket: ${bucket}):`, error.message);
        // Don't fail completely - return guidance
        return NextResponse.json({
          error: `Upload failed: ${error.message}. Fix: In Supabase → Storage → Buckets → create bucket "Images" → set to Public, OR add SUPABASE_SERVICE_ROLE_KEY to .env.local`
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      error: "No storage bucket found. Create a bucket named 'Images' (capital I) in Supabase Storage and set it to Public."
    }, { status: 500 });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
