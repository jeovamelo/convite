import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, getAdminPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({}));

  if (!password || password !== getAdminPassword()) {
    return NextResponse.json({ error: "Credenciais invalidas" }, { status: 401 });
  }

  const token = createSessionToken();
  const response = NextResponse.json({ success: true });
  response.cookies.set("lm_admin_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  return response;
}

