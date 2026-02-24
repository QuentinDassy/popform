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
    if (!serviceKey) {
      console.warn("SUPABASE_SERVICE_ROLE_KEY not set — falling back to anon key");
    }

    const client = createClient(url, serviceKey || anonKey, {
      auth: { persistSession: false },
    });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const { error } = await client.storage
      .from("images")
      .upload(path, buffer, { contentType: file.type || "image/jpeg", upsert: true });

    if (error) {
      console.error("Upload error:", error.message);
      return NextResponse.json({ error: `Upload failed: ${error.message}` }, { status: 500 });
    }

    const { data: urlData } = client.storage.from("images").getPublicUrl(path);
    return NextResponse.json({ url: urlData.publicUrl });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
