import { NextResponse } from "next/server";
import { addEvaluationToSession, getSession } from "../../../lib/sessionStore";

export async function POST(request: Request) {
  const body = await request.json();

  const sessionId =
    typeof body.sessionId === "string" ? body.sessionId.trim() : "";
  if (!sessionId) {
    return new NextResponse("sessionId is required", { status: 400 });
  }

  const session = await getSession(sessionId);
  if (!session) {
    return new NextResponse("Session not found", { status: 404 });
  }

  const evaluator =
    typeof body.evaluator === "string" && body.evaluator.trim().length > 0
      ? body.evaluator
      : "Anonymous";

  const ratings = body.ratings as Record<string, number> | undefined;
  const overallScore = Number(body.overallScore);

  if (!ratings || Number.isNaN(overallScore)) {
    return new NextResponse("Invalid rating payload", { status: 400 });
  }

  const updated = await addEvaluationToSession(
    sessionId,
    evaluator,
    ratings,
    overallScore,
  );

  if (!updated) {
    return new NextResponse("Failed to save evaluation", { status: 500 });
  }

  return NextResponse.json(updated, { status: 201 });
}
