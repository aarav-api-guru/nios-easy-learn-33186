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
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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
    fields: "files(id,name,mimeType,modifiedTime,size,iconLink,description),nextPageToken",
    orderBy: "modifiedTime desc",
    pageSize: "1000",
  });

  if (sharedDriveId) {
    params.set("driveId", sharedDriveId);
    params.set("corpora", "drive");
    params.set("supportsAllDrives", "true");
    params.set("includeItemsFromAllDrives", "true");
  }
  let pageToken;
  const files = [];

  do {
    if (pageToken) {
      params.set("pageToken", pageToken);
    } else {
      params.delete("pageToken");
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
    if (Array.isArray(payload.files)) {
      files.push(...payload.files);
    }
    pageToken = payload.nextPageToken;
  } while (pageToken);

  return files;
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

const fetchFolderFileCount = async ({
  apiKey,
  folderId,
  sharedDriveId,
}) => {
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed=false`,
    key: apiKey,
    fields: "files(id,mimeType),nextPageToken",
    pageSize: "1000",
  });

  if (sharedDriveId) {
    params.set("driveId", sharedDriveId);
    params.set("corpora", "drive");
    params.set("supportsAllDrives", "true");
    params.set("includeItemsFromAllDrives", "true");
  }

  let pageToken;
  let total = 0;

  do {
    if (pageToken) {
      params.set("pageToken", pageToken);
    } else {
      params.delete("pageToken");
    }

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?${params.toString()}`
    );
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message = payload?.error?.message;
      console.error("Drive API folder child count error", payload);
      throw new Error(
        message ? `Unable to load chapter resources: ${message}` : `Unable to load chapter resources: ${response.status}`
      );
    }
    if (!payload) {
      throw new Error("Drive API returned an empty response while counting files.");
    }

    const files = payload.files ?? [];
    total += files.filter((file) => file.mimeType !== FOLDER_MIME).length;
    pageToken = payload.nextPageToken;
  } while (pageToken);

  return total;
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
  const [countError, setCountError] = useState(null);
  const [loadingCounts, setLoadingCounts] = useState(false);

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

  useEffect(() => {
    if (!files.length || !API_KEY) {
      setFolderCounts({});
      setCountError(null);
      setLoadingCounts(false);
      return;
    }

    const folderItems = files.filter((file) => file.mimeType === FOLDER_MIME);
    if (!folderItems.length) {
      setFolderCounts({});
      setCountError(null);
      setLoadingCounts(false);
      return;
    }

    let cancelled = false;
    const loadCounts = async () => {
      setLoadingCounts(true);
      try {
        const entries = await Promise.all(
          folderItems.map(async (folder) => {
            const count = await fetchFolderFileCount({
              apiKey: API_KEY,
              folderId: folder.id,
              sharedDriveId: SHARED_DRIVE_ID,
            });
            return [folder.id, count];
          })
        );
        if (!cancelled) {
          setFolderCounts(Object.fromEntries(entries));
          setCountError(null);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          const message =
            err instanceof Error && err.message
              ? err.message
              : "We couldn't determine how many resources are in each chapter.";
          setCountError(message);
        }
      } finally {
        if (!cancelled) {
          setLoadingCounts(false);
        }
      }
    };

    loadCounts();

    return () => {
      cancelled = true;
    };
  }, [API_KEY, SHARED_DRIVE_ID, files]);

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

  const filteredRegularFiles = useMemo(() => {
    const query = fileSearchQuery.trim().toLowerCase();
    if (!query) {
      return splitFiles.regularFiles;
    }

    return splitFiles.regularFiles.filter((file) => {
      const name = file.name?.toLowerCase() ?? "";
      const description = file.description?.toLowerCase() ?? "";
      return name.includes(query) || description.includes(query);
    });
  }, [fileSearchQuery, splitFiles.regularFiles]);

  const chapterItems = useMemo(() => {
    return splitFiles.folders.map((folder, index) => ({
      folder,
      chapterNumber: index + 1,
    }));
  }, [splitFiles.folders]);

  const filteredChapterItems = useMemo(() => {
    const query = fileSearchQuery.trim().toLowerCase();
    if (!query) {
      return chapterItems;
    }

    return chapterItems.filter(({ folder, chapterNumber }) => {
      const name = folder.name?.toLowerCase() ?? "";
      const description = folder.description?.toLowerCase() ?? "";
      const chapterLabel = `chapter ${chapterNumber}`;
      return (
        name.includes(query) ||
        description.includes(query) ||
        `${chapterNumber}` === query.replace(/[^0-9]/g, "") ||
        chapterLabel.includes(query)
      );
    });
  }, [chapterItems, fileSearchQuery]);

  const visibleRegularFiles = filteredRegularFiles;

  if (initializing) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" aria-hidden />
        <span className="ml-3 text-muted-foreground">Preparing Drive browser…</span>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="relative mx-auto w-full max-w-xl">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-500" />
        <Input
          value={fileSearchQuery}
          onChange={(event) => setFileSearchQuery(event.target.value)}
          placeholder="Search chapters by name or number..."
          className="h-12 rounded-full border-emerald-100 bg-white pl-12 text-base shadow-sm focus-visible:ring-emerald-500"
        />
      </div>

      <Card className="rounded-3xl border border-emerald-100 bg-white shadow-sm">
        <CardContent className="space-y-6 p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-semibold text-emerald-700">
                {currentFolder?.name ?? "Mathematics"}
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                {folderStack.length > 1
                  ? "Browse the resources inside this chapter."
                  : "Explore the available chapters and resources."}
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {folderStack.length > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-200 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={handleRefresh}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-200 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
              >
                <RefreshCcw className="h-4 w-4" aria-hidden />
                Refresh
              </button>
            </div>
          </div>

          {breadcrumbs.length > 1 && (
            <nav className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleBreadcrumbClick(index)}
                    disabled={crumb.isLast}
                    className={`rounded-full px-3 py-1 transition ${
                      crumb.isLast
                        ? "bg-emerald-500 text-white"
                        : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
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
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          {countError && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
              {countError}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-500" aria-hidden />
              <span>Loading resources…</span>
            </div>
          ) : filteredChapterItems.length === 0 && visibleRegularFiles.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              {fileSearchQuery
                ? "No chapters or files match your search."
                : "There are no resources to display right now."}
            </div>
          ) : (
            <div className="space-y-8">
              {filteredChapterItems.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredChapterItems.map(({ folder, chapterNumber }) => {
                    const resourceCount = folderCounts[folder.id];
                    const hasCount = typeof resourceCount === "number";

                    return (
                      <button
                        key={folder.id}
                        type="button"
                        onClick={() => handleFolderClick({ id: folder.id, name: folder.name })}
                        className="group flex h-full flex-col gap-4 rounded-3xl border border-emerald-100 bg-emerald-50/40 p-6 text-left shadow-sm transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-md"
                      >
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-4 py-1 text-sm font-semibold text-emerald-600">
                            Chapter {chapterNumber}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-emerald-600 shadow">
                            <File className="h-3.5 w-3.5" aria-hidden />
                            {hasCount ? resourceCount : loadingCounts ? "…" : 0}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold text-slate-800 group-hover:text-emerald-700">
                            {folder.name}
                          </h3>
                          {folder.description && (
                            <p className="text-sm text-muted-foreground">
                              {folder.description}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {visibleRegularFiles.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-muted-foreground">
                    Files
                  </h4>
                  <div className="grid gap-3 md:grid-cols-2">
                    {visibleRegularFiles.map((file) => (
                      <button
                        key={file.id}
                        type="button"
                        onClick={() => setPreviewFile(file)}
                        className="group flex h-full flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-md"
                      >
                        <div className="flex items-center gap-3">
                          <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
                            <File className="h-5 w-5" aria-hidden />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-800 group-hover:text-emerald-700">
                              {file.name}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              {formatDate(file.modifiedTime) && (
                                <span>Updated {formatDate(file.modifiedTime)}</span>
                              )}
                              {formatSize(file.size) && (
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-600">
                                  {formatSize(file.size)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {file.description && (
                          <p className="text-sm text-muted-foreground">
                            {file.description}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-600"
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
  );
};

export default MathDriveBrowser;
