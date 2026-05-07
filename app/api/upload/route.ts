// app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

const BUCKET_NAME = "geotechnical-data";
const RAW_FOLDER = "raw";
const OLD_RAW_FOLDER = "old_raw_files";
const TARGET_FILENAME = "Raw_data.xlsx";
const PYTHON_API_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

// Mark as dynamic to prevent build-time execution
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        // Create Supabase client inside the handler
        const supabase = createServerClient();

        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json(
                { error: "No file provided" },
                { status: 400 }
            );
        }

        // Validate file type (Excel files only)
        const validTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel'
        ];

        if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
            return NextResponse.json(
                { error: "Only Excel files (.xlsx, .xls) are allowed" },
                { status: 400 }
            );
        }

        console.log(`📤 Uploading file: ${file.name}`);
        console.log(`📦 File size: ${file.size} bytes`);

        // Step 1: Check if Raw_Data.xlsx exists in raw folder
        const currentFilePath = `${RAW_FOLDER}/${TARGET_FILENAME}`;

        try {
            const { data: existingFile } = await supabase.storage
                .from(BUCKET_NAME)
                .list(RAW_FOLDER);

            const rawDataExists = existingFile?.some(f => f.name === TARGET_FILENAME);

            if (rawDataExists) {
                console.log(`📁 Found existing ${TARGET_FILENAME}, moving to archive...`);

                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
                const archivePath = `${OLD_RAW_FOLDER}/Raw_Data_${timestamp}.xlsx`;

                // Move existing file to old_raw_files folder
                const { error: moveError } = await supabase.storage
                    .from(BUCKET_NAME)
                    .move(currentFilePath, archivePath);

                if (moveError) {
                    console.error("Error moving file:", moveError);
                } else {
                    console.log(`✅ Archived old file to: ${archivePath}`);
                }
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Unknown error checking file";
            console.log("No existing file found or error checking:", errorMessage);
        }

        // Step 2: Upload new file as Raw_Data.xlsx
        const fileBuffer = await file.arrayBuffer();
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(currentFilePath, fileBuffer, {
                contentType: file.type,
                upsert: true
            });

        if (uploadError) {
            console.error("Upload error:", uploadError);
            return NextResponse.json(
                { error: uploadError.message },
                { status: 400 }
            );
        }

        console.log(`✅ Successfully uploaded as ${TARGET_FILENAME}`);

        // Step 3: Trigger Python pipeline
        console.log(`🚀 Triggering Python pipeline at ${PYTHON_API_URL}/pipeline-and-train/start`);

        const apiKey = process.env.API_SECRET_KEY;
        if (!apiKey) {
            console.error("API_SECRET_KEY is not configured");
            return NextResponse.json({
                success: true,
                message: `File uploaded successfully as ${TARGET_FILENAME}, but pipeline API key not configured`,
                path: uploadData.path,
                originalName: file.name,
                pipelineError: 'API_SECRET_KEY environment variable not set',
                pipelineStatus: 'failed'
            });
        }

        try {
            const pipelineResponse = await fetch(`${PYTHON_API_URL}/pipeline-and-train/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                },
                body: JSON.stringify({
                    file_path: currentFilePath,
                    bucket_name: BUCKET_NAME,
                    trigger_source: 'upload'
                })
            });

            const pipelineData = await pipelineResponse.json();

            if (!pipelineResponse.ok) {
                console.error("Pipeline trigger failed:", pipelineData);
                return NextResponse.json({
                    success: true,
                    message: `File uploaded successfully as ${TARGET_FILENAME}, but pipeline failed to start`,
                    path: uploadData.path,
                    originalName: file.name,
                    pipelineError: pipelineData.error || 'Unknown error',
                    pipelineStatus: 'failed'
                });
            }

            console.log(`✅ Pipeline started successfully:`, pipelineData);

            return NextResponse.json({
                success: true,
                message: `File uploaded successfully as ${TARGET_FILENAME} and pipeline started`,
                path: uploadData.path,
                originalName: file.name,
                pipelineStatus: 'started',
                pipelineData: pipelineData
            });

        } catch (pipelineError) {
            const errorMessage = pipelineError instanceof Error ? pipelineError.message : "Unknown pipeline error";
            console.error("Error triggering pipeline:", errorMessage);

            return NextResponse.json({
                success: true,
                message: `File uploaded successfully as ${TARGET_FILENAME}, but failed to trigger pipeline`,
                path: uploadData.path,
                originalName: file.name,
                pipelineError: errorMessage,
                pipelineStatus: 'failed'
            });
        }

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to upload file";
        console.error("Upload error:", errorMessage);
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}