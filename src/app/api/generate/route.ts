import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import QRCode from "qrcode";
import sharp from "sharp";
import JSZip from "jszip";
import jsQR from "jsqr";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveImageUrl } from "@/lib/imageUrl";
import fs from "fs";
import path from "path";

const generateSecureToken = (length = 16) => {
  return crypto.randomBytes(length).toString("hex");
};

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

    const quantity = parseInt(formData.get("quantity") as string, 10);
    const peoplePerInvite = parseInt(formData.get("peoplePerInvite") as string, 10);
    const imageDataUrl = formData.get("image_data_url") as string | null;
    const layoutId = formData.get("layout_id") as string;

    if ((!imageFile && !imageDataUrl && !layoutId) || isNaN(qr_x) || isNaN(qr_y) || isNaN(qr_size) || isNaN(quantity)) {
      return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
    }

    let baseImageBuffer: Buffer | null = null;
    
    if (imageFile) {
      baseImageBuffer = Buffer.from(await imageFile.arrayBuffer());
    } else if (imageDataUrl) {
      const base64Data = imageDataUrl.includes(",") ? imageDataUrl.split(",")[1] : imageDataUrl;
      baseImageBuffer = Buffer.from(base64Data, "base64");
    } else if (layoutId) {
      const { data } = await supabaseAdmin.from('settings').select('base_image').eq('id', layoutId).single();
      if (data?.base_image) {
        if (data.base_image.startsWith("/uploads/")) {
          const filePath = path.join(process.cwd(), "public", data.base_image);
          if (fs.existsSync(filePath)) {
            baseImageBuffer = fs.readFileSync(filePath);
          }
        } else if (data.base_image.startsWith("http://") || data.base_image.startsWith("https://")) {
          try {
            const imgRes = await fetch(resolveImageUrl(data.base_image));
            if (imgRes.ok) baseImageBuffer = Buffer.from(await imgRes.arrayBuffer());
          } catch {}
        } else {
          const base64Data = data.base_image.replace(/^data:image\/\w+;base64,/, "");
          baseImageBuffer = Buffer.from(base64Data, 'base64');
        }
      }
    }

    if (!baseImageBuffer) {
      return NextResponse.json({ error: "Missing image file and no base image configured." }, { status: 400 });
    }

    const zip = new JSZip();
    const generatedRecords: Array<{
      id: string;
      public_id: string;
      token_hash: string;
      quantidade_pessoas: number;
      status: string;
      created_at: string;
      used_at: string | null;
    }> = [];
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://convite.ilocseguro.com";

    for (let i = 1; i <= quantity; i++) {
      const publicId = `LM-${i.toString().padStart(4, "0")}`;
      const token = generateSecureToken();
      const uniqueUrl = `${baseUrl}/evento/${token}`;

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
        throw new Error(`Falha na validação do QR Code para o exibível ${publicId}.`);
      }

      // 3. Generate ID SVG text layer
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

      // 4. Composite both QR and ID over base image
      const finalImageBuffer = await sharp(baseImageBuffer)
        .composite([
          { input: qrCodeBuffer, top: qr_y, left: qr_x },
          { input: svgBuffer, top: id_y, left: id_x }
        ])
        .png()
        .toBuffer();

      const fileName = `exibivel_${publicId}.png`;
      zip.file(fileName, finalImageBuffer);

      const record = {
        id: crypto.randomUUID(),
        public_id: publicId,
        token_hash: crypto.createHash('sha256').update(token).digest('hex'),
        quantidade_pessoas: peoplePerInvite,
        status: 'AVAILABLE',
        created_at: new Date().toISOString(),
        used_at: null
      };
      generatedRecords.push(record);
    }

    // ignoreDuplicates: public_ids já existentes (e seus tokens/status de
    // check-in) são preservados — regenerar um lote não invalida exibíveis
    // já impressos nem zera entradas registradas.
    const { error: insertError } = await supabaseAdmin.from("tickets").upsert(generatedRecords, {
      onConflict: "public_id",
      ignoreDuplicates: true,
    });

    if (insertError) {
      throw insertError;
    }

    zip.file("database.json", JSON.stringify(generatedRecords, null, 2));
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

    return new NextResponse(zipBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="exibiveis_lm_4anos.zip"`,
      },
    });

  } catch (error: any) {
    console.error("Generate API Error:", error);
    return NextResponse.json({ error: error.message || "Erro interno do servidor." }, { status: 500 });
  }
}
