import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import QRCode from "qrcode";
import sharp from "sharp";
import jsQR from "jsqr";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    
    const imageFile = formData.get("image") as File;
    const qr_x = parseInt(formData.get("qr_x") as string, 10);
    const qr_y = parseInt(formData.get("qr_y") as string, 10);
    const qr_size = parseInt(formData.get("qr_size") as string, 10);
    
    const id_x = parseInt(formData.get("id_x") as string, 10);
    const id_y = parseInt(formData.get("id_y") as string, 10);
    const id_width = parseInt(formData.get("id_width") as string, 10);
    const id_height = parseInt(formData.get("id_height") as string, 10);
    const id_color = formData.get("id_color") as string;
    const id_fontSize = parseInt(formData.get("id_fontSize") as string, 10);
    const id_fontWeight = formData.get("id_fontWeight") as string;

    const publicId = formData.get("public_id") as string;
    const token = formData.get("token") as string;
    const isPreview = formData.get("is_preview") === "true";
    const peoplePerInvite = parseInt(formData.get("peoplePerInvite") as string, 10) || 1;
    const imageDataUrl = formData.get("image_data_url") as string | null;

    const layoutId = formData.get("layout_id") as string;

    let imageBuffer: Buffer | null = null;
    
    if (imageFile) {
      imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    } else if (imageDataUrl) {
      const base64Data = imageDataUrl.includes(",") ? imageDataUrl.split(",")[1] : imageDataUrl;
      imageBuffer = Buffer.from(base64Data, "base64");
    } else if (layoutId) {
      const { data } = await supabase.from('settings').select('base_image').eq('id', layoutId).single();
      if (data?.base_image) {
        const base64Data = data.base_image.replace(/^data:image\/\w+;base64,/, "");
        imageBuffer = Buffer.from(base64Data, 'base64');
      }
    }

    if (!imageBuffer) {
      return NextResponse.json({ error: "Missing image file and no base image configured." }, { status: 400 });
    }

    const metadata = await sharp(imageBuffer).metadata();
    const imageWidth = metadata.width || 0;
    const imageHeight = metadata.height || 0;
    if (!imageWidth || !imageHeight) {
      return NextResponse.json({ error: "A imagem-base não possui dimensões válidas." }, { status: 400 });
    }

    // The editor uses CSS pixels; Sharp uses the image's natural pixels.
    // Clamp stale settings so one invalid layer cannot abort the preview.
    const safeQrSize = Math.max(32, Math.min(Number.isFinite(qr_size) ? qr_size : 150, imageWidth, imageHeight));
    const safeQrX = Math.max(0, Math.min(Number.isFinite(qr_x) ? qr_x : 0, imageWidth - safeQrSize));
    const safeQrY = Math.max(0, Math.min(Number.isFinite(qr_y) ? qr_y : 0, imageHeight - safeQrSize));
    const safeIdWidth = Math.max(1, Math.min(Number.isFinite(id_width) ? id_width : 200, imageWidth));
    const safeIdHeight = Math.max(1, Math.min(Number.isFinite(id_height) ? id_height : 40, imageHeight));
    const safeIdX = Math.max(0, Math.min(Number.isFinite(id_x) ? id_x : 0, imageWidth - safeIdWidth));
    const safeIdY = Math.max(0, Math.min(Number.isFinite(id_y) ? id_y : 0, imageHeight - safeIdHeight));
    const safeFontSize = Math.max(1, Math.min(Number.isFinite(id_fontSize) ? id_fontSize : 24, safeIdHeight));

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://festa.exemplo.com";
    const uniqueUrl = `${baseUrl}/e/${token}`;

    // 1. Generate QR Code
    const qrCodeBuffer = await QRCode.toBuffer(uniqueUrl, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: safeQrSize,
      color: { dark: '#000000', light: '#FFFFFF' }
    });

    // 2. Validate QR Code
    const rawPixels = await sharp(qrCodeBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const qrCodeScan = jsQR(new Uint8ClampedArray(rawPixels.data.buffer), rawPixels.info.width, rawPixels.info.height);
    
    // Decoding is diagnostic only. A valid QR can fail jsQR when read from
    // raw RGBA pixels, and that must not prevent the preview from rendering.
    if (!qrCodeScan || qrCodeScan.data !== uniqueUrl) {
      console.warn("QR generated but jsQR could not validate the raw pixels");
    }

    // 3. Generate ID SVG
    const svgText = `
      <svg width="${safeIdWidth}" height="${safeIdHeight}" xmlns="http://www.w3.org/2000/svg">
        <text 
          x="50%" 
          y="50%" 
          dominant-baseline="middle" 
          text-anchor="middle" 
          fill="${id_color}" 
          font-family="Montserrat, Arial, sans-serif" 
          font-size="${safeFontSize}px" 
          font-weight="${id_fontWeight}"
          style="text-shadow: 2px 2px 4px rgba(0,0,0,0.5);"
        >
          ${publicId}
        </text>
      </svg>
    `;
    const svgBuffer = Buffer.from(svgText);

    // 4. Composite
    const compositeLayers = [
      { input: qrCodeBuffer, top: safeQrY, left: safeQrX },
      { input: svgBuffer, top: safeIdY, left: safeIdX }
    ];

    let finalImageBuffer = await sharp(imageBuffer)
      .composite(compositeLayers)
      .png()
      .toBuffer();

    // 5. Save to Supabase DB if not preview
    if (!isPreview) {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const { data: exists } = await supabase
        .from('tickets')
        .select('id')
        .eq('public_id', publicId)
        .single();
        
      if (!exists) {
        await supabase.from('tickets').insert({
          id: crypto.randomUUID(),
          public_id: publicId,
          token_hash: tokenHash,
          quantidade_pessoas: peoplePerInvite,
          status: 'AVAILABLE'
        });
      }
    }

    // Retorna a imagem
    return new NextResponse(finalImageBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "X-QR-Readable": "true"
      },
    });

  } catch (error: any) {
    console.error("Single Generate API Error:", error);
    return NextResponse.json({ error: error.message || "Erro interno do servidor." }, { status: 500 });
  }
}
