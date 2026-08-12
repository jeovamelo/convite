import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { action } = await req.json();

    if (action === "reception") {
      // Reset reception (make all used tickets available again)
      // This is a safe UPDATE — no records are deleted.
      const { error } = await supabase
        .from("tickets")
        .update({ status: "AVAILABLE", used_at: null, checked_in_by: null })
        .not("id", "is", null);
      if (error) {
        console.error("Error resetting reception:", error);
        throw error;
      }
      return NextResponse.json({ success: true, message: "A recepção foi resetada. Todos os exibíveis estão disponíveis para uso." });
    }

    return NextResponse.json({ error: "Ação inválida ou não permitida." }, { status: 400 });
  } catch (error: any) {
    console.error("Reset API catch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
