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

  const criteria =
    Array.isArray(body.criteria) && body.criteria.length > 0
      ? body.criteria
      : [
          {
            id: "explainability",
            label: "Explainability",
            description: "How well concepts were broken down and explained.",
            weight: 1,
          },
          {
            id: "clarity",
            label: "Clarity",
            description: "How clear and easy to follow the presentation was.",
            weight: 1,
          },
          {
            id: "content",
            label: "Content Quality",
            description: "Depth, accuracy, and organization of the content.",
            weight: 1,
          },
          {
            id: "engagement",
            label: "Engagement",
            description: "How well the presenter kept the audience engaged.",
            weight: 1,
          },
          {
            id: "timeManagement",
            label: "Time Management",
            description: "Pacing and use of the allotted time.",
            weight: 1,
          },
          {
            id: "delivery",
            label: "Delivery",
            description: "Voice, body language, and overall delivery.",
            weight: 1,
          },
        ];

  const session = await createSession(presenter, createdBy, criteria);
  return NextResponse.json(session, { status: 201 });
}
