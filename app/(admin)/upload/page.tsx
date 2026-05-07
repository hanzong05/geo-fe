"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LoginModal from "@/app/components/login-modal";

interface FileItem {
  name: string;
  size?: number;
  created_at?: string;
  updated_at?: string;
  metadata?: {
    size?: number;
  };
}

interface FolderItem {
  name: string;
  created_at?: string;
}

interface UploadResponse {
  success: boolean;
  message?: string;
  error?: string;
  originalName?: string;
  pipelineStatus?: "started" | "failed" | "not_started";
  pipelineError?: string;
}

interface FoldersResponse {
  success: boolean;
  folders: FolderItem[];
  error?: string;
}

interface FilesResponse {
  success: boolean;
  files: FileItem[];
  error?: string;
}

const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? "";
const apiHeaders = { "x-api-key": API_KEY };

export default function Page() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);


  // Check auth on mount
  useEffect(() => {
    const authenticated = sessionStorage.getItem("admin_authenticated") === "true";
    setIsAuthenticated(authenticated);
    setAuthChecked(true);
  }, []);

  // Fetch folders on mount (only when authenticated)
  useEffect(() => {
    if (isAuthenticated) fetchFolders();
  }, [isAuthenticated]);

  const fetchFolders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/folders", { headers: apiHeaders });
      const data: FoldersResponse = await res.json();
      if (data.success && data.folders) {
        setFolders(data.folders);
      }
    } catch (err) {
      console.error("Error fetching folders:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch files when a folder is selected
  useEffect(() => {
    if (!selectedFolder) return;

    const fetchFiles = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/files/${selectedFolder}`, { headers: apiHeaders });
        const data: FilesResponse = await res.json();
        if (data.success && data.files) {
          setFiles(data.files);
        }
      } catch (err) {
        console.error("Error fetching files:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [selectedFolder]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      alert("Please upload only Excel files (.xlsx or .xls)");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: apiHeaders,
        body: formData,
      });

      const data: UploadResponse = await res.json();

      if (data.success) {

        let message = `✅ ${data.message || "Upload successful"}\n\nOriginal file: ${data.originalName || file.name}\nSaved as: Raw_Data.xlsx`;

        // Add pipeline status to message
        if (data.pipelineStatus === "started") {
          message += "\n\n🚀 Pipeline processing started successfully!";
        } else if (data.pipelineStatus === "failed") {
          message += `\n\n⚠️ Warning: Pipeline failed to start\nError: ${data.pipelineError || "Unknown error"}`;
        }

        alert(message);

        // Refresh folders and select raw folder
        await fetchFolders();
        setSelectedFolder("raw");
      } else {
        alert(`❌ Upload failed: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("❌ Upload failed. Please try again.");
    } finally {
      setUploading(false);
      // Reset input value
      if (e.target) {
        e.target.value = "";
      }
    }
  };

  const formatBytes = (bytes?: number): string => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const downloadFile = async (fileName: string) => {
    if (!selectedFolder) return;
    try {
      const res = await fetch(`/api/download?folder=${encodeURIComponent(selectedFolder)}&file=${encodeURIComponent(fileName)}`, { headers: apiHeaders });
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank");
      } else {
        alert(`Download failed: ${data.error || "Unknown error"}`);
      }
    } catch {
      alert("Download failed. Please try again.");
    }
  };

  const downloadFolder = () => {
    files.forEach((file) => { downloadFile(file.name); });
  };

  // Auth loading state
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
          <p className="text-gray-500 text-sm">Checking authentication…</p>
        </div>
      </div>
    );
  }

  // Not authenticated — block access
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-10 max-w-sm w-full text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-red-50 rounded-full mb-4">
            <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m2-5V9m0 0V7m0 2h2M12 9H10M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-500 text-sm mb-6">
            You must be logged in as an admin to access this page.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setShowLoginModal(true)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Login
            </button>
            <button
              onClick={() => router.push("/")}
              className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
            >
              Go to Home
            </button>
          </div>
        </div>
        <LoginModal
          open={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onSuccess={() => setIsAuthenticated(true)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Geotechnical Data Storage
              </h1>
              <p className="text-gray-600 mt-2">
                Browse and download geotechnical data files
              </p>
            </div>

            {/* Upload Button */}
            <div className="flex items-center gap-4">
              <label
                htmlFor="file-upload"
                className={`px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer font-medium ${
                  uploading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {uploading ? "📤 Uploading..." : "📤 Upload Raw Data"}
              </label>
              <input
                id="file-upload"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
            </div>
          </div>

          {/* Upload Instructions */}
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>📝 Upload Instructions:</strong> Upload an Excel file
              (.xlsx or .xls). It will be automatically renamed to{" "}
              <code className="bg-blue-100 px-2 py-1 rounded">
                Raw_Data.xlsx
              </code>{" "}
              and saved in the <strong>raw</strong> folder. Any existing file
              will be archived to <strong>old_raw_files</strong>.
            </p>
          </div>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        )}

        {/* Folders View */}
        {!selectedFolder && !loading && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">
              Folders ({folders.length})
            </h2>
            {folders.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No folders found in storage
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {folders.map((folder) => (
                  <div
                    key={folder.name}
                    onClick={() => setSelectedFolder(folder.name)}
                    className="p-6 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-500 hover:shadow-lg transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-4xl">📁</span>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {folder.name}
                        </p>
                        {folder.created_at && (
                          <p className="text-xs text-gray-500 mt-1">
                            Created:{" "}
                            {new Date(folder.created_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Files View */}
        {selectedFolder && !loading && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedFolder}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {files.length} file{files.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex gap-2">
                {files.length > 0 && (
                  <button
                    onClick={downloadFolder}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Download All Files
                  </button>
                )}
                <button
                  onClick={() => setSelectedFolder(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  ← Back to Folders
                </button>
              </div>
            </div>

            {files.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No files in this folder
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {files.map((file) => (
                  <div
                    key={file.name}
                    className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow flex justify-between items-center"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📄</span>
                      <div>
                        <p className="font-medium text-gray-900">{file.name}</p>
                        <div className="flex gap-3 text-xs text-gray-500 mt-1">
                          {file.metadata?.size && (
                            <span>{formatBytes(file.metadata.size)}</span>
                          )}
                          {file.updated_at && (
                            <span>
                              Modified:{" "}
                              {new Date(file.updated_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => downloadFile(file.name)}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
                    >
                      Download
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
