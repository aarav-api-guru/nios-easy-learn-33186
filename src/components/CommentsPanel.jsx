import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, MessageCircle, RefreshCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const getTimestamp = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatTimestamp = (value) => {
  const date = getTimestamp(value);
  if (!date) return null;
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const CommentsPanel = ({
  title = "Comments & Discussion",
  description = "Ask questions or share your thoughts",
  embedded = false,
  className,
}) => {
  const { toast } = useToast();
  const [comments, setComments] = useState([]);
  const [formData, setFormData] = useState({ name: "", comment: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const normalizedModule = module?.trim() || "";

  const commentsEndpoint = useMemo(() => {
    const base = (import.meta.env.VITE_COMMENTS_API_URL || "http://localhost:3000").replace(/\/$/, "");
    const url = new URL(`${base}/comments`);

    if (normalizedModule) {
      url.searchParams.set("module", normalizedModule);
    }

    return url.toString();
  }, [normalizedModule]);

  useEffect(() => {
    setComments([]);
    setError(null);
  }, [normalizedModule]);

  const fetchComments = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(commentsEndpoint);
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          (payload && (payload.error || payload.message)) ||
          `Failed to load comments (status ${response.status})`;
        throw new Error(message);
      }

      const items = Array.isArray(payload) ? payload : [];
      const filteredItems = normalizedModule
        ? items.filter(
            (item) => (item?.module ?? item?.Module ?? "").trim().toLowerCase() === normalizedModule.toLowerCase()
          )
        : items;

      setComments(filteredItems);
      setError(null);
    } catch (fetchError) {
      console.error("Failed to load comments", fetchError);
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Unable to load comments at the moment."
      );
    } finally {
      setIsLoading(false);
    }
  }, [commentsEndpoint]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedName = formData.name.trim();
    const trimmedComment = formData.comment.trim();

    if (!trimmedName || !trimmedComment) {
      toast({
        title: "Missing details",
        description: "Please provide both your name and a comment before posting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        user_id: Math.floor(100000 + Math.random() * 900000),
        user_name: trimmedName,
        comment: trimmedComment,
        ...(normalizedModule ? { module: normalizedModule } : {}),
      };

      const response = await fetch(commentsEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const savedComment = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          (savedComment && (savedComment.error || savedComment.message)) ||
          `Failed to submit comment (status ${response.status})`;
        throw new Error(message);
      }

      setComments((prev) => [savedComment, ...prev]);
      setFormData({ name: "", comment: "" });
      setError(null);

      toast({
        title: "Comment posted!",
        description: "Your comment has been added successfully.",
      });
    } catch (submitError) {
      console.error("Failed to submit comment", submitError);
      toast({
        title: "Unable to post comment",
        description:
          submitError instanceof Error
            ? submitError.message
            : "Something went wrong while saving your comment.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const headerContent = (
    <>
      <div>
        <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
          <MessageCircle className="h-5 w-5" aria-hidden />
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2 shrink-0 sm:mt-0"
        onClick={fetchComments}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <RefreshCcw className="mr-2 h-4 w-4" aria-hidden />
        )}
        Refresh
      </Button>
    </>
  );

  const bodyContent = (
    <>
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border border-border/40 bg-muted/30 p-4"
      >
        <Input
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Your name *"
          autoComplete="name"
          disabled={isSubmitting}
        />
        <Textarea
          name="comment"
          value={formData.comment}
          onChange={handleChange}
          placeholder="Share your thoughts... *"
          rows={4}
          disabled={isSubmitting}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            Post Comment
          </Button>
        </div>
      </form>

      {isLoading ? (
        <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          <span>Loading comments…</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-center text-sm text-destructive">
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle className="h-4 w-4" aria-hidden />
            Unable to load comments
          </div>
          <p className="text-xs opacity-80">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchComments}>
            Try again
          </Button>
        </div>
      ) : comments.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border/60 bg-background/70 p-6 text-center text-sm text-muted-foreground">
          <MessageCircle className="h-8 w-8 opacity-70" aria-hidden />
          <div>
            <p className="font-medium text-foreground">No comments yet</p>
            <p>Be the first to start the discussion.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => {
            const createdAt =
              comment?.created_at || comment?.createdAt || comment?.created_on;

            return (
              <div
                key={comment.comment_id || `${comment.user_id}-${comment.comment}`}
                className="rounded-xl border border-border/60 bg-background/80 p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">
                      {comment.user_name || "Anonymous"}
                    </p>
                    {comment.user_id != null && (
                      <p className="text-xs text-muted-foreground">
                        User ID: {comment.user_id}
                      </p>
                    )}
                  </div>
                  {formatTimestamp(createdAt) && (
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(createdAt)}
                    </span>
                  )}
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                  {comment.comment}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </>
  );

  if (embedded) {
    return (
      <section
        className={cn(
          "rounded-3xl border border-border/60 bg-background/60 p-6 shadow-sm backdrop-blur",
          className
        )}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {headerContent}
        </div>
        <div className="mt-6 space-y-6">{bodyContent}</div>
      </section>
    );
  }

  return (
    <Card className={cn("border border-border/70 bg-card/80 shadow-sm", className)}>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {headerContent}
      </CardHeader>
      <CardContent className="space-y-6">{bodyContent}</CardContent>
    </Card>
  );
};

export default CommentsPanel;
