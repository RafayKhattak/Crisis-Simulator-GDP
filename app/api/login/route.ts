import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/password";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  signSession,
} from "@/lib/session";
import { fetchTraineeByEmail, isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 }
    );
  }

  if (!isSupabaseConfigured() || !process.env.AUTH_SECRET) {
    return NextResponse.json(
      { error: "Sign-in is not configured on this deployment." },
      { status: 503 }
    );
  }

  try {
    const trainee = await fetchTraineeByEmail(email);
    const ok =
      trainee !== null && (await verifyPassword(password, trainee.password_hash));
    if (!ok || !trainee) {
      return NextResponse.json(
        { error: "Those credentials are not authorised." },
        { status: 401 }
      );
    }

    const token = await signSession({
      id: trainee.id,
      email: trainee.email,
      name: trainee.name,
    });

    const response = NextResponse.json({
      trainee: { id: trainee.id, email: trainee.email, name: trainee.name },
    });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not sign in.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
