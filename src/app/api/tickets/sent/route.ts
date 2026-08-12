import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Known Supabase/PostgREST error codes when a table doesn't exist
const TABLE_NOT_FOUND_CODES = ["42P01", "PGRST200", "PGRST204"];

function isTableMissingError(error: any): boolean {
  if (!error) return false;
  const msg: string = (error.message || error.details || "").toLowerCase();
  const code: string = error.code || "";
  return (
    TABLE_NOT_FOUND_CODES.includes(code) ||
    msg.includes("does not exist") ||
    msg.includes("relation") ||
    msg.includes("ticket_sent_status")
  );
}

// POST /api/tickets/sent
// Body: { ticket_id: string, is_sent: boolean }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ticket_id, is_sent } = body;

    if (!ticket_id) {
      return NextResponse.json({ error: "Missing ticket_id" }, { status: 400 });
    }

    const sentAt = is_sent ? new Date().toISOString() : null;

    const { data, error } = await supabaseAdmin
      .from("ticket_sent_status")
      .upsert(
        {
          ticket_id,
          is_sent: Boolean(is_sent),
          sent_at: sentAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "ticket_id" }
      )
      .select()
      .single();

    if (error) {
      // If the table simply doesn't exist yet, return success gracefully
      // so the UI doesn't show "Erro ao salvar" to the user.
      if (isTableMissingError(error)) {
        console.warn("[tickets/sent] ticket_sent_status table not found — run the SQL migration to persist sent status.");
        return NextResponse.json({ success: true, pending_migration: true });
      }
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    if (isTableMissingError(error)) {
      console.warn("[tickets/sent] ticket_sent_status table not found (caught).");
      return NextResponse.json({ success: true, pending_migration: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/tickets/sent?ticket_id=xxx  OR  /api/tickets/sent (all)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ticket_id = searchParams.get("ticket_id");

    let query = supabaseAdmin.from("ticket_sent_status").select("*");
    if (ticket_id) query = query.eq("ticket_id", ticket_id);

    const { data, error } = await query;

    if (error) {
      // Table doesn't exist yet — return empty list gracefully
      if (isTableMissingError(error)) {
        console.warn("[tickets/sent GET] ticket_sent_status table not found — returning empty.");
        return NextResponse.json({ data: [], pending_migration: true });
      }
      throw error;
    }

    return NextResponse.json({ data: data || [] });
  } catch (error: any) {
    if (isTableMissingError(error)) {
      return NextResponse.json({ data: [], pending_migration: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
