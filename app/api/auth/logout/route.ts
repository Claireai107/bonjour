import { NextRequest, NextResponse } from "next/server";
import { audit } from "@/lib/db";
import { hashIp } from "@/lib/crypto";

export async function POST(req: NextRequest) {
  await audit({
    action: "logout",
    ip_hash: hashIp(req.headers.get("x-forwarded-for") || ""),
  });
  const res = NextResponse.json({ ok: true });
  res.cookies.set("bj_session", "", { path: "/", maxAge: 0 });
  return res;
}
