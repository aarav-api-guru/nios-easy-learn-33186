import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Download,
  File,
  Loader2,
  RefreshCcw,
  Search,
  X,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import CommentsPanel from "@/components/CommentsPanel";

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

const fetchDriveFiles = async ({ apiKey, folderId, sharedDriveId }) => {
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed=false`,
    key: apiKey,
    fields: "files(id,name,mimeType,modifiedTime,size,iconLink,description,properties)",
    orderBy: "modifiedTime desc",
  });

  if (sharedDriveId) {
    params.set("driveId", sharedDriveId);
    params.set("corpora", "drive");
    params.set("supportsAllDrives", "true");
    params.set("includeItemsFromAllDrives", "true");
  }
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

const fetchFolderFileCount = async ({ apiKey, folderId, sharedDriveId }) => {
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed=false`,
    key: apiKey,
    fields: "files(id)",
    pageSize: "1000",
  });

  if (sharedDriveId) {
    params.set("driveId", sharedDriveId);
    params.set("corpora", "drive");
    params.set("supportsAllDrives", "true");
    params.set("includeItemsFromAllDrives", "true");
  }

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`
  );
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.error?.message;
    console.error("Drive API folder count error", payload);
    throw new Error(
      message ? `Unable to fetch folder details: ${message}` : `Unable to fetch folder details: ${response.status}`
    );
  }

  if (!payload) {
    throw new Error("Drive API returned an empty response while loading folder details.");
  }

  return payload.files?.length ?? 0;
};

const getFolderMetadata = (name, description, fallbackChapter) => {
  const cleanedName = name?.trim() ?? "Untitled";
  const cleanedDescription = description?.trim() ?? "";

  const segments = cleanedName
    .split(/[\-|–|:]/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  let chapterLabel = fallbackChapter ?? null;
  let title = cleanedName;
  let subtitle = cleanedDescription;

  if (segments.length) {
    const [firstSegment, ...rest] = segments;
    const chapterMatch = firstSegment.match(/chapter\s*(\d+)/i);

    if (chapterMatch) {
      chapterLabel = `Chapter ${chapterMatch[1]}`;
      if (rest.length) {
        title = rest[0];
        if (rest.length > 1) {
          subtitle = rest.slice(1).join(" – ");
        }
      } else if (cleanedDescription) {
        title = cleanedName.replace(firstSegment, "").replace(/^[\s\-|–:]+/, "").trim() || cleanedName;
      }
    } else {
      title = cleanedName;
    }
  }

  if (!subtitle && cleanedDescription) {
    subtitle = cleanedDescription;
  }

  if (!chapterLabel) {
    const looseChapterMatch = cleanedName.match(/chapter\s*(\d+)/i);
    if (looseChapterMatch) {
      chapterLabel = `Chapter ${looseChapterMatch[1]}`;
    }
  }

  return {
    chapterLabel: chapterLabel ?? fallbackChapter,
    title,
    subtitle,
  };
};

const fetchDriveFolderInfo = async ({ apiKey, folderId, sharedDriveId }) => {
  const params = new URLSearchParams({
    key: apiKey,
    fields: "id,name",
  });

  if (sharedDriveId) {
    params.set("supportsAllDrives", "true");
  }
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
  const SHARED_DRIVE_ID = import.meta.env.VITE_GOOGLE_DRIVE_SHARED_DRIVE_ID;

  const [folderStack, setFolderStack] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [fileSearchQuery, setFileSearchQuery] = useState("");
  const [folderCounts, setFolderCounts] = useState({});

  const currentFolder = folderStack[folderStack.length - 1];
  const currentFolderId = currentFolder?.id;

  useEffect(() => {
    if (!ROOT_FOLDER_ID || !API_KEY) {
      setError(
        "Missing Google Drive configuration. Set VITE_GOOGLE_DRIVE_ROOT_FOLDER_ID and VITE_GOOGLE_API_KEY. If you are using a shared drive, also provide VITE_GOOGLE_DRIVE_SHARED_DRIVE_ID."
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
          sharedDriveId: SHARED_DRIVE_ID,
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
  }, [ROOT_FOLDER_ID, API_KEY, SHARED_DRIVE_ID]);

  useEffect(() => {
    if (!currentFolderId || !API_KEY) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const driveFiles = await fetchDriveFiles({
          apiKey: API_KEY,
          folderId: currentFolderId,
          sharedDriveId: SHARED_DRIVE_ID,
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
  }, [API_KEY, SHARED_DRIVE_ID, currentFolderId, reloadToken]);

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

  const filteredFiles = useMemo(() => {
    const query = fileSearchQuery.trim().toLowerCase();
    if (!query) {
      return files;
    }
    return files.filter((file) => file.name?.toLowerCase().includes(query));
  }, [fileSearchQuery, files]);

  const splitFiles = useMemo(() => {
    const folders = [];
    const regularFiles = [];
    for (const file of filteredFiles) {
      if (file.mimeType === FOLDER_MIME) {
        folders.push(file);
      } else {
        regularFiles.push(file);
      }
    }
    return { folders, regularFiles };
  }, [filteredFiles]);

  useEffect(() => {
    if (!API_KEY || !splitFiles.folders.length) return;

    let cancelled = false;

    const loadCounts = async () => {
      const foldersToFetch = splitFiles.folders.filter((folder) => folderCounts[folder.id] == null);
      if (!foldersToFetch.length) return;

      const updates = {};

      for (const folder of foldersToFetch) {
        try {
          const count = await fetchFolderFileCount({
            apiKey: API_KEY,
            folderId: folder.id,
            sharedDriveId: SHARED_DRIVE_ID,
          });
          if (!cancelled) {
            updates[folder.id] = count;
          }
        } catch (err) {
          console.error(err);
          if (!cancelled) {
            updates[folder.id] = 0;
          }
        }
      }

      if (!cancelled && Object.keys(updates).length) {
        setFolderCounts((prev) => ({ ...prev, ...updates }));
      }
    };

    loadCounts();

    return () => {
      cancelled = true;
    };
  }, [API_KEY, SHARED_DRIVE_ID, splitFiles.folders, folderCounts]);

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
      <Card className="space-y-6 border-none bg-transparent shadow-none">
      <CardHeader className="gap-4 pb-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle className="text-2xl font-semibold text-foreground">
              Mathematics Resources
            </CardTitle>
            <CardDescription>
              Browse files directly from the connected Google Drive folder.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {folderStack.length > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium transition hover:bg-muted"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Back
              </button>
            )}
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition hover:border-primary hover:bg-primary/20"
            >
              <RefreshCcw className="h-4 w-4" aria-hidden />
              Refresh
            </button>
          </div>
        </div>

        {breadcrumbs.length > 0 && (
          <nav className="flex flex-wrap items-center gap-2 text-sm">
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleBreadcrumbClick(index)}
                  disabled={crumb.isLast}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    crumb.isLast
                      ? "cursor-default bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                  }`}
                >
                  {crumb.name || "Unnamed"}
                </button>
                {!crumb.isLast && <span className="text-muted-foreground">/</span>}
              </div>
            ))}
          </nav>
        )}

        {error && (
          <div className="w-full rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="flex flex-col gap-6">
          <div className="relative w-full max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={fileSearchQuery}
              onChange={(event) => setFileSearchQuery(event.target.value)}
              placeholder="Search chapters by name or number…"
              className="h-12 w-full rounded-full border border-muted-foreground/20 bg-background pl-11 text-sm shadow-sm"
            />
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
              <span>Loading files…</span>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {fileSearchQuery ? "No files match your search." : "This folder is empty."}
            </div>
          ) : (
            <div className="space-y-8">
              {splitFiles.folders.length > 0 && (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {splitFiles.folders.map((folder, index) => {
                    const metadata = getFolderMetadata(
                      folder.name,
                      folder.description,
                      `Chapter ${index + 1}`
                    );

                    const fileCount = folderCounts[folder.id];

                    return (
                      <button
                        key={folder.id}
                        type="button"
                        onClick={() => handleFolderClick({ id: folder.id, name: folder.name })}
                        className="group flex h-full w-full flex-col rounded-3xl border border-emerald-100 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1.5 hover:shadow-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="inline-flex items-center gap-3 rounded-full bg-emerald-100 px-4 py-1 text-xs font-semibold text-emerald-700">
                            <span>{metadata.chapterLabel}</span>
                            <span className="flex items-center gap-1 rounded-full bg-emerald-200/60 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                              <File className="h-3.5 w-3.5" aria-hidden />
                              {fileCount == null ? "…" : fileCount}
                            </span>
                          </div>
                        </div>
                        <div className="mt-6 space-y-2">
                          <p className="text-lg font-semibold text-foreground group-hover:text-primary">
                            {metadata.title || folder.name}
                          </p>
                          {metadata.subtitle && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {metadata.subtitle}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {splitFiles.regularFiles.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Files
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {splitFiles.regularFiles.map((file) => (
                      <button
                        key={file.id}
                        type="button"
                        onClick={() => setPreviewFile(file)}
                        className="group flex w-full flex-col gap-3 rounded-2xl border border-muted-foreground/10 bg-card p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="rounded-xl bg-muted p-3 text-muted-foreground">
                            <File className="h-5 w-5" aria-hidden />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground group-hover:text-primary">
                              {file.name}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              {formatDate(file.modifiedTime) && (
                                <span>Updated {formatDate(file.modifiedTime)}</span>
                              )}
                              {formatSize(file.size) && (
                                <span className="rounded-full bg-muted px-2 py-0.5">
                                  {formatSize(file.size)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>

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
      </Card>

      <CommentsPanel />
    </div>
  );
};

export default MathDriveBrowser;
