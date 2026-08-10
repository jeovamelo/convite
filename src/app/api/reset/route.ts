import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { action } = await req.json();

    if (action === "tickets") {
      // Delete all tickets
      const { error } = await supabase.from("tickets").delete().not("id", "is", null);
      if (error) {
        console.error("Error deleting tickets:", error);
        throw error;
      }
      return NextResponse.json({ success: true, message: "Todos os exibíveis foram deletados." });
    }

    if (action === "reception") {
      // Reset reception (make all used tickets available again)
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

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Reset API catch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
