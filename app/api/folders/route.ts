// app/api/folders/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

const BUCKET_NAME = "geotechnical-data";

// Mark as dynamic to prevent build-time execution
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Create Supabase client inside the handler
        const supabase = createServerClient();

        // List everything in the bucket
        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .list();

        if (error) {
            console.error("Storage error:", error);
            return NextResponse.json({
                error: error.message,
                details: error
            }, { status: 400 });
        }

        console.log("Storage data:", data);

        // Extract folder names
        const folders = data
            .filter(item => !item.id) // Folders don't have IDs in Supabase
            .map(folder => ({
                name: folder.name,
                created_at: folder.created_at
            }));

        console.log("Folders found:", folders);

        return NextResponse.json({
            success: true,
            folders,
            rawData: data // For debugging
        });
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        console.error("Error:", errorMessage);
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}