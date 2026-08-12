import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveImageUrl } from "@/lib/imageUrl";

const BUCKET_NAME = "event-assets";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const layoutId = searchParams.get('layout_id');

  const baseQuery = supabaseAdmin.from('settings').select('base_image');

  const { data, error } = layoutId
    ? await baseQuery.eq('id', layoutId).single()
    : await baseQuery.order('id', { ascending: true }).limit(1).single();
  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (data?.base_image) {
    return NextResponse.json({ image: resolveImageUrl(data.base_image) });
  }
  return NextResponse.json({ image: null });
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.formData();
    const file = data.get("image") as File;
    const layoutId = data.get("layout_id") as string;

    if (!layoutId) {
      return NextResponse.json({ error: 'Missing layout id' }, { status: 400 });
    }
    if (!file) {
      return NextResponse.json({ error: 'Missing image file' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name?.split('.').pop()?.toLowerCase() || 'png';
    const contentType = file.type || (ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png');
    const fileName = `layouts/${layoutId}.${ext}`;

    // Ensure bucket exists (create if needed)
    try {
      const { data: buckets } = await supabaseAdmin.storage.listBuckets();
      const exists = buckets?.some((b: any) => b.name === BUCKET_NAME);
      if (!exists) {
        await supabaseAdmin.storage.createBucket(BUCKET_NAME, { public: true });
      }
    } catch (bucketErr: any) {
      console.warn("[LAYOUT-UPLOAD] Bucket check/create warning:", bucketErr?.message);
    }

    // Upload to Supabase Storage (persists across deploys)
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(fileName, buffer, {
        contentType,
        upsert: true,
        cacheControl: "3600",
      });

    if (uploadError) {
      console.error("[LAYOUT-UPLOAD] Storage upload error:", uploadError);
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    const { data: urlData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    // Store the browser-reachable public URL, never the internal Docker host
    const publicUrl = resolveImageUrl(urlData?.publicUrl || "");

    const { error } = await supabaseAdmin
      .from('settings')
      .update({ base_image: publicUrl })
      .eq('id', layoutId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, image: publicUrl });
  } catch (error: any) {
    console.error("[LAYOUT-UPLOAD] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
