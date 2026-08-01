"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Megaphone } from "lucide-react";

import { createManualNotificationAction } from "@/app/admin/(dashboard)/notifications/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

/**
 * Kinetra CRM — announcement composer (Phase 8).
 *
 * Manual "megaphone" notifications for the team: broadcast to every admin or
 * target one teammate, with an optional High priority flag. Everything else
 * in the notification feed is trigger-generated; this is the one human entry
 * point. Validation mirrors createManualNotificationAction's zod schema.
 */

const ALL_ADMINS = "__all__";

interface AnnouncementDialogProps {
  admins: { id: string; label: string }[];
}

export function AnnouncementDialog({ admins }: AnnouncementDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [recipient, setRecipient] = useState<string>(ALL_ADMINS);
  const [priority, setPriority] = useState<string>("normal");
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setTitle("");
    setBody("");
    setRecipient(ALL_ADMINS);
    setPriority("normal");
    setError(null);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmed = title.trim();
    if (!trimmed) {
      setError("Add a title.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await createManualNotificationAction({
        title: trimmed,
        body: body.trim() || undefined,
        recipientId: recipient === ALL_ADMINS ? null : recipient,
        priority,
      });

      if (!result.ok) {
        setError(result.error ?? "Couldn't send the announcement.");
        return;
      }

      toast({
        title: "Announcement sent",
        description:
          recipient === ALL_ADMINS
            ? "Every admin will see it in their notifications."
            : "It's waiting in their notifications.",
      });
      resetForm();
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 border-border">
          <Megaphone className="h-4 w-4" aria-hidden="true" />
          New announcement
        </Button>
      </DialogTrigger>

      <DialogContent className="border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New announcement</DialogTitle>
          <DialogDescription>
            Post a manual notification for the team — it lands in the bell and
            the notification center.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="announcement-title">Title</Label>
            <Input
              id="announcement-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Studio closed Friday"
              maxLength={140}
              required
              className="border-border bg-background"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="announcement-body">
              Message{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Textarea
              id="announcement-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Add context for the team…"
              maxLength={1000}
              rows={3}
              className="border-border bg-background"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="announcement-recipient">Send to</Label>
              <Select value={recipient} onValueChange={setRecipient}>
                <SelectTrigger
                  id="announcement-recipient"
                  className="border-border bg-background"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_ADMINS}>All admins</SelectItem>
                  {admins.map((admin) => (
                    <SelectItem key={admin.id} value={admin.id}>
                      {admin.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="announcement-priority">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger
                  id="announcement-priority"
                  className="border-border bg-background"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !title.trim()}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Sending…
                </>
              ) : (
                "Send announcement"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}