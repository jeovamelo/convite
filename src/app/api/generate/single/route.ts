import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import QRCode from "qrcode";
import sharp from "sharp";
import jsQR from "jsqr";
import { mockDB } from "@/lib/mockDb";
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

    let imageBuffer: Buffer | null = null;
    
    if (imageFile) {
      imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    } else {
      const { data } = await supabase.from('settings').select('base_image').eq('id', 1).single();
      if (data?.base_image) {
        const base64Data = data.base_image.replace(/^data:image\/\w+;base64,/, "");
        imageBuffer = Buffer.from(base64Data, 'base64');
      }
    }

    if (!imageBuffer) {
      return NextResponse.json({ error: "Missing image file and no base image configured." }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://festa.exemplo.com";
    const uniqueUrl = `${baseUrl}/e/${token}`;

    // 1. Generate QR Code
    const qrCodeBuffer = await QRCode.toBuffer(uniqueUrl, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: qr_size,
      color: { dark: '#000000', light: '#FFFFFF' }
    });

    // 2. Validate QR Code
    const rawPixels = await sharp(qrCodeBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const qrCodeScan = jsQR(new Uint8ClampedArray(rawPixels.data.buffer), rawPixels.info.width, rawPixels.info.height);
    
    if (!qrCodeScan || qrCodeScan.data !== uniqueUrl) {
      throw new Error(`Falha na leitura/validação do QR Code.`);
    }

    // 3. Generate ID SVG
    const svgText = `
      <svg width="${id_width}" height="${id_height}" xmlns="http://www.w3.org/2000/svg">
        <text 
          x="50%" 
          y="50%" 
          dominant-baseline="middle" 
          text-anchor="middle" 
          fill="${id_color}" 
          font-family="Montserrat, Arial, sans-serif" 
          font-size="${id_fontSize}px" 
          font-weight="${id_fontWeight}"
          style="text-shadow: 2px 2px 4px rgba(0,0,0,0.5);"
        >
          ${publicId}
        </text>
      </svg>
    `;
    const svgBuffer = Buffer.from(svgText);

    // 4. Composite
    let finalImageBuffer = await sharp(imageBuffer)
      .composite([
        { input: qrCodeBuffer, top: qr_y, left: qr_x },
        { input: svgBuffer, top: id_y, left: id_x }
      ])
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
    return new NextResponse(finalImageBuffer, {
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
