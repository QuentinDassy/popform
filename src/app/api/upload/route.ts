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

    const client = createClient(url, serviceKey || anonKey, {
      auth: { persistSession: false },
    });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // List buckets to find the right one
    const { data: buckets } = await client.storage.listBuckets();
    const bucketNames = buckets?.map(b => b.name) || [];
    console.log("Available buckets:", bucketNames);

    // Try all possible bucket names
    const toTry = [...bucketNames, "images", "Images", "public"].filter((v, i, a) => a.indexOf(v) === i);
    
    for (const bucket of toTry) {
      const { error } = await client.storage
        .from(bucket)
        .upload(path, buffer, { contentType: file.type || "image/jpeg", upsert: true });

      if (!error) {
        const { data: urlData } = client.storage.from(bucket).getPublicUrl(path);
        return NextResponse.json({ url: urlData.publicUrl });
      }
      console.log(`Bucket ${bucket} failed:`, error.message);
    }

    return NextResponse.json({
      error: `Upload failed. Available buckets: ${bucketNames.join(", ") || "none"}. Create a public bucket named "images" in Supabase Storage.`
    }, { status: 500 });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
