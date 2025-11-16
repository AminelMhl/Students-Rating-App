import { NextResponse } from "next/server";
import { deleteSession, getSession } from "../../../../lib/sessionStore";

type ParamsPromise = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: ParamsPromise) {
  const { id } = await context.params;

  const session = await getSession(id);
  if (!session) {
    return new NextResponse("Session not found", { status: 404 });
  }

  return NextResponse.json(session);
}

export async function DELETE(_request: Request, context: ParamsPromise) {
  const { id } = await context.params;

  const existing = await getSession(id);
  if (!existing) {
    return new NextResponse("Session not found", { status: 404 });
  }

  const ok = await deleteSession(id);
  if (!ok) {
    return new NextResponse("Failed to delete session", { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
