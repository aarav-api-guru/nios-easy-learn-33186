import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Download,
  File,
  FolderOpen,
  Loader2,
  RefreshCcw,
  X,
} from "lucide-react";

const FOLDER_MIME = "application/vnd.google-apps.folder";

const formatSize = (bytes) => {
  if (!bytes || Number.isNaN(Number(bytes))) return "";
  const value = Number(bytes);
  if (value < 1024) return `${value} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let size = value / 1024;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

const formatDate = (dateString) => {
  if (!dateString) return "";
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(dateString));
  } catch (error) {
    console.error("Failed to format date", error);
    return "";
  }
};

const fetchDriveFiles = async ({ apiKey, folderId }) => {
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed=false`,
    key: apiKey,
    fields: "files(id,name,mimeType,modifiedTime,size,iconLink)",
    orderBy: "modifiedTime desc",
    includeItemsFromAllDrives: "true",
    supportsAllDrives: "true",
    corpora: "allDrives",
  });
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`
  );
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error?.message;
    console.error("Drive API error payload", payload);
    throw new Error(message ? `Drive API error: ${message}` : `Drive API error: ${response.status}`);
  }
  if (!payload) {
    throw new Error("Drive API returned an empty response.");
  }
  return payload.files ?? [];
};

const fetchDriveFolderInfo = async ({ apiKey, folderId }) => {
  const params = new URLSearchParams({
    key: apiKey,
    fields: "id,name",
    supportsAllDrives: "true",
  });
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${folderId}?${params.toString()}`
  );
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error?.message;
    console.error("Drive API folder info error", payload);
    throw new Error(
      message ? `Failed to fetch folder info: ${message}` : `Failed to fetch folder info: ${response.status}`
    );
  }
  if (!payload) {
    throw new Error("Drive API returned an empty response while loading folder info.");
  }
  return payload;
};

const MathDriveBrowser = () => {
  const ROOT_FOLDER_ID = import.meta.env.VITE_GOOGLE_DRIVE_ROOT_FOLDER_ID;
  const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

  const [folderStack, setFolderStack] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);

  const currentFolder = folderStack[folderStack.length - 1];
  const currentFolderId = currentFolder?.id;

  useEffect(() => {
    if (!ROOT_FOLDER_ID || !API_KEY) {
      setError(
        "Missing Google Drive environment configuration. Please set VITE_GOOGLE_DRIVE_ROOT_FOLDER_ID and VITE_GOOGLE_API_KEY."
      );
      setInitializing(false);
      return;
    }

    let cancelled = false;

    const initialize = async () => {
      setInitializing(true);
      try {
        const info = await fetchDriveFolderInfo({
          apiKey: API_KEY,
          folderId: ROOT_FOLDER_ID,
        });
        if (!cancelled) {
          setFolderStack([{ id: info.id, name: info.name ?? "Mathematics" }]);
          setError(null);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          const message =
            err instanceof Error && err.message
              ? err.message
              : "We couldn't load the Mathematics Drive folder. Please verify the folder ID and API key.";
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setInitializing(false);
        }
      }
    };

    initialize();

    return () => {
      cancelled = true;
    };
  }, [ROOT_FOLDER_ID, API_KEY]);

  useEffect(() => {
    if (!currentFolderId || !API_KEY) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const driveFiles = await fetchDriveFiles({
          apiKey: API_KEY,
          folderId: currentFolderId,
        });
        if (!cancelled) {
          setFiles(driveFiles);
          setError(null);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          const message =
            err instanceof Error && err.message
              ? err.message
              : "Unable to fetch the latest files from Google Drive. Please try refreshing.";
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [API_KEY, currentFolderId, reloadToken]);

  const breadcrumbs = useMemo(() => {
    if (!folderStack.length) return [];
    return folderStack.map((folder, index) => ({
      ...folder,
      isLast: index === folderStack.length - 1,
    }));
  }, [folderStack]);

  const handleFolderClick = (folder) => {
    setFolderStack((prev) => [...prev, folder]);
  };

  const handleBreadcrumbClick = (index) => {
    setFolderStack((prev) => prev.slice(0, index + 1));
  };

  const handleBack = () => {
    setFolderStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  };

  const handleRefresh = () => {
    setReloadToken((token) => token + 1);
  };

  const getPreviewUrl = (id) => `https://drive.google.com/file/d/${id}/preview`;

  const getDownloadUrl = (id) =>
    `https://drive.google.com/uc?export=download&id=${id}`;

  const splitFiles = useMemo(() => {
    const folders = [];
    const regularFiles = [];
    for (const file of files) {
      if (file.mimeType === FOLDER_MIME) {
        folders.push(file);
      } else {
        regularFiles.push(file);
      }
    }
    return { folders, regularFiles };
  }, [files]);

  if (initializing) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
        <span className="ml-3 text-muted-foreground">Preparing Drive browser…</span>
      </div>
    );
  }

  if (error && !folderStack.length) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">
            Mathematics Resources
          </h2>
          <p className="text-sm text-muted-foreground">
            Browse files directly from the connected Google Drive folder.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium transition hover:bg-muted"
        >
          <RefreshCcw className="h-4 w-4" aria-hidden /> Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {breadcrumbs.length > 0 && (
        <nav className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleBreadcrumbClick(index)}
                disabled={crumb.isLast}
                className={`rounded-md px-2 py-1 transition ${
                  crumb.isLast
                    ? "cursor-default bg-primary/10 text-primary"
                    : "hover:bg-muted"
                }`}
              >
                {crumb.name || "Unnamed"}
              </button>
              {!crumb.isLast && <span className="text-muted-foreground">/</span>}
            </div>
          ))}
        </nav>
      )}

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FolderOpen className="h-4 w-4" aria-hidden />
            <span>{splitFiles.folders.length} folders</span>
            <span className="text-border">•</span>
            <File className="h-4 w-4" aria-hidden />
            <span>{splitFiles.regularFiles.length} files</span>
          </div>

          {folderStack.length > 1 && (
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium transition hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden /> Back
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
            <span>Loading files…</span>
          </div>
        ) : files.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            This folder is empty.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {[...splitFiles.folders, ...splitFiles.regularFiles].map((file) => (
              <div key={file.id}>
                {file.mimeType === FOLDER_MIME ? (
                  <button
                    type="button"
                    onClick={() =>
                      handleFolderClick({ id: file.id, name: file.name })
                    }
                    className="flex w-full items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-left transition hover:border-primary hover:bg-primary/10"
                  >
                    <div className="mt-1 rounded-lg bg-primary/20 p-2">
                      <FolderOpen className="h-5 w-5 text-primary" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-primary">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Updated {formatDate(file.modifiedTime)}
                      </p>
                    </div>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPreviewFile(file)}
                    className="flex w-full items-start gap-3 rounded-xl border border-border bg-background p-4 text-left transition hover:border-primary/40 hover:shadow-sm"
                  >
                    <div className="mt-1 rounded-lg bg-muted p-2">
                      <File className="h-5 w-5 text-muted-foreground" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{file.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {formatDate(file.modifiedTime) && (
                          <span>Updated {formatDate(file.modifiedTime)}</span>
                        )}
                        {formatSize(file.size) && (
                          <span className="rounded bg-muted px-2 py-0.5">
                            {formatSize(file.size)}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {previewFile.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Last updated {formatDate(previewFile.modifiedTime)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={getDownloadUrl(previewFile.id)}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
                >
                  <Download className="h-4 w-4" aria-hidden /> Download
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewFile(null)}
                  className="rounded-full p-2 text-muted-foreground transition hover:bg-muted"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>

            <div className="aspect-video w-full">
              <iframe
                src={getPreviewUrl(previewFile.id)}
                title={previewFile.name}
                className="h-full w-full"
                allow="autoplay"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MathDriveBrowser;
