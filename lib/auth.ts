import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  readSession,
  SESSION_COOKIE,
  type SessionTrainee,
} from "@/lib/session";

export async function getSession(): Promise<SessionTrainee | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return readSession(token);
}

export async function requireSession(): Promise<
  { trainee: SessionTrainee; error?: undefined } | { trainee?: undefined; error: NextResponse }
> {
  const trainee = await getSession();
  if (!trainee) {
    return {
      error: NextResponse.json(
        { error: "Sign in to continue." },
        { status: 401 }
      ),
    };
  }
  return { trainee };
}
