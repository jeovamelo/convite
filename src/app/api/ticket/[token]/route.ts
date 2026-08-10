import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase";

// Consulta pública e SOMENTE LEITURA do exibível pelo token.
// Nunca altera status — check-in é exclusivo da rota /api/recepcao/scan.
export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const token = params.token;

  if (!token) {
    return NextResponse.json({ status: "INVALID" }, { status: 400 });
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const { data: record, error } = await supabaseAdmin
    .from("tickets")
    .select("public_id, status, quantidade_pessoas, guest_name, used_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!record) {
    return NextResponse.json({ status: "INVALID" }, { status: 404 });
  }

  return NextResponse.json({
    status: record.status,
    public_id: record.public_id,
    quantidade_pessoas: record.quantidade_pessoas,
    guest_name: record.guest_name,
    used_at: record.used_at,
  });
}
