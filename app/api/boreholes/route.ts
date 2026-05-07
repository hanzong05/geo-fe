import { NextRequest, NextResponse } from "next/server";

const PYTHON_API_URL = (process.env.PYTHON_SERVICE_URL || "http://localhost:8000").replace(/\.$/, "");
const API_SECRET_KEY = process.env.API_SECRET_KEY!;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const municipality = searchParams.get("municipality");

  let url = `${PYTHON_API_URL}/boreholes`;
  if (municipality) url += `?municipality=${encodeURIComponent(municipality)}`;

  try {
    const res = await fetch(url, {
      headers: { "x-api-key": API_SECRET_KEY },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: "Unknown error" }));
      return NextResponse.json({ error: error.detail }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[/api/boreholes] fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch boreholes" }, { status: 500 });
  }
}
