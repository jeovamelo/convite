import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  const filePath = "C:\\Users\\jeova\\.gemini\\antigravity-ide\\brain\\43d24de8-d735-4403-b16e-fd09181038dc\\media__1786304857109.jpg";
  
  try {
    const fileBuffer = fs.readFileSync(filePath);
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }
}
