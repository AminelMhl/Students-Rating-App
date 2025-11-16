import { NextResponse } from "next/server";
import { createSession, listSessions } from "../../../lib/sessionStore";

export async function GET() {
  const sessions = await listSessions();
  return NextResponse.json(sessions);
}

export async function POST(request: Request) {
  const body = await request.json();
  const presenter = typeof body.presenter === "string" ? body.presenter : "";
  const createdBy =
    typeof body.createdBy === "string" && body.createdBy.trim().length > 0
      ? body.createdBy
      : "Teacher";

  if (!presenter.trim()) {
    return new NextResponse("Presenter is required", { status: 400 });
  }

  const session = await createSession(presenter, createdBy);
  return NextResponse.json(session, { status: 201 });
}
