// app/api/download/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

const BUCKET_NAME = "geotechnical-data";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const folder = searchParams.get("folder");
        const file = searchParams.get("file");

        if (!folder || !file) {
            return NextResponse.json({ error: "Missing folder or file parameter" }, { status: 400 });
        }

        const supabase = createServerClient();
        const filePath = `${folder}/${file}`;

        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .createSignedUrl(filePath, 60); // URL valid for 60 seconds

        if (error || !data?.signedUrl) {
            console.error("Signed URL error:", error);
            return NextResponse.json({ error: error?.message || "Failed to generate download URL" }, { status: 400 });
        }

        return NextResponse.json({ url: data.signedUrl });
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        console.error("Download error:", errorMessage);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
