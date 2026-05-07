import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (
    username === adminUsername &&
    password === adminPassword
  ) {
    return NextResponse.json({ success: true });
  }

  return NextResponse.json(
    { success: false, error: "Invalid username or password" },
    { status: 401 }
  );
}
