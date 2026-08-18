import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// POST /api/tickets/sent
// Body: { ticket_id: string, is_sent: boolean }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ticket_id, is_sent } = body;

    if (!ticket_id) {
      return NextResponse.json({ error: "Missing ticket_id" }, { status: 400 });
    }

    const isSentBool = Boolean(is_sent);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(ticket_id));
    const filterCol = isUuid ? "id" : "public_id";

    // Direct update on public.tickets table
    const { data, error } = await supabaseAdmin
      .from("tickets")
      .update({
        is_sent: isSentBool
      })
      .eq(filterCol, ticket_id)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("[POST /api/tickets/sent] Update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, is_sent: isSentBool, ticket: data });
  } catch (error: any) {
    console.error("[POST /api/tickets/sent] Exception:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/tickets/sent?ticket_id=xxx  OR  /api/tickets/sent (all)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ticket_id = searchParams.get("ticket_id");

    let query = supabaseAdmin.from("tickets").select("*");

    if (ticket_id) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(ticket_id));
      query = isUuid ? query.eq("id", ticket_id) : query.eq("public_id", ticket_id);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[GET /api/tickets/sent] Query error:", error);
      return NextResponse.json({ data: [] });
    }

    const mapped = (data || []).map((t: any) => ({
      id: t.id,
      public_id: t.public_id,
      ticket_id: t.id,
      is_sent: Boolean(t.is_sent || t.sent_status === "ENVIADO" || t.sent_status === "SENT")
    }));

    return NextResponse.json({ data: mapped });
  } catch (error: any) {
    console.error("[GET /api/tickets/sent] Exception:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
