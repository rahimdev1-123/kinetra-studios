    "use client";

import { useActionState, useState, useTransition } from "react";
import { format } from "date-fns";
import { Loader2, PenLine, Plus, StickyNote, Trash2 } from "lucide-react";

import {
  addNoteAction,
  deleteNoteAction,
  updateNoteAction,
  type AddNoteFormState,
} from "@/app/admin/(dashboard)/leads/[id]/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

/**
 * Kinetra CRM — internal notes (Phase 4).
 *
 * Add (React 19 useActionState), edit, and delete notes via server actions.
 * Notes render oldest → newest like a conversation. Edit/delete are only
 * offered on the viewer's own notes, mirroring the RLS policy. The activity
 * timeline picks the changes up automatically via the DB triggers.
 */

export interface NoteView {
  id: string;
  body: string;
  authorId: string;
  authorLabel: string;
  createdAt: string;
  updatedAt: string | null;
}

interface LeadNotesProps {
  leadId: string;
  currentAdminId: string;
  notes: NoteView[];
}

const initialAddState: AddNoteFormState = {
  status: "idle",
  error: null,
  resetKey: 0,
};

function NoteItem({
  note,
  isOwn,
}: {
  note: NoteView;
  isOwn: boolean;
}) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(note.body);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  function saveEdit() {
    const body = draft.trim();
    if (body === "" || body === note.body) {
      setIsEditing(false);
      setDraft(note.body);
      return;
    }

    startTransition(async () => {
      const result = await updateNoteAction(note.id, body);
      if (result.ok) {
        setIsEditing(false);
        toast({ title: "Note updated" });
      } else {
        toast({
          title: "Couldn't update note",
          description: result.error,
          variant: "destructive",
        });
      }
    });
  }

  function runDelete() {
    startTransition(async () => {
      const result = await deleteNoteAction(note.id);
      if (result.ok) {
        toast({ title: "Note deleted" });
      } else {
        toast({
          title: "Couldn't delete note",
          description: result.error,
          variant: "destructive",
        });
      }
    });
  }

  return (
    <li className="rounded-md border border-border bg-background/40 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-foreground">
          {note.authorLabel}
          {isOwn ? (
            <span className="ml-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              you
            </span>
          ) : null}
        </p>
        <p
          className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
          title={format(new Date(note.createdAt), "PPpp")}
        >
          {format(new Date(note.createdAt), "MMM d, yyyy · HH:mm")}
          {note.updatedAt ? " · edited" : ""}
        </p>
      </div>

      {isEditing ? (
        <div className="mt-2 flex flex-col gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            maxLength={5000}
            disabled={isPending}
            aria-label="Edit note"
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={saveEdit}
              disabled={isPending}
              className="gap-2"
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : null}
              Save
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={isPending}
              onClick={() => {
                setIsEditing(false);
                setDraft(note.body);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
          {note.body}
        </p>
      )}

      {isOwn && !isEditing ? (
        <div className="mt-2 flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
            onClick={() => setIsEditing(true)}
            disabled={isPending}
          >
            <PenLine className="h-3.5 w-3.5" aria-hidden="true" />
            Edit
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-muted-foreground hover:text-destructive"
            onClick={() => setConfirmDelete(true)}
            disabled={isPending}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Delete
          </Button>
        </div>
      ) : null}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this note?</AlertDialogTitle>
            <AlertDialogDescription>
              The note is removed for every admin. The activity timeline keeps
              a record that a note was deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={runDelete} disabled={isPending}>
              Delete note
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}

export function LeadNotes({ leadId, currentAdminId, notes }: LeadNotesProps) {
  const [addState, addAction, isAdding] = useActionState(
    addNoteAction,
    initialAddState,
  );

  return (
    <div className="flex flex-col gap-4">
      {notes.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border px-4 py-8 text-center">
          <StickyNote
            className="h-5 w-5 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="text-sm text-muted-foreground">
            No notes yet. Keep call summaries, context, and next steps here —
            visible to the whole team, never to the client.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {notes.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              isOwn={note.authorId === currentAdminId}
            />
          ))}
        </ul>
      )}

      {/* key={resetKey}: remounts (clears) the form after a successful add */}
      <form
        key={addState.resetKey}
        action={addAction}
        className="flex flex-col gap-2"
      >
        <input type="hidden" name="leadId" value={leadId} />

        {addState.status === "error" && addState.error ? (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{addState.error}</AlertDescription>
          </Alert>
        ) : null}

        <Textarea
          name="body"
          rows={3}
          maxLength={5000}
          required
          placeholder="Add an internal note…"
          aria-label="New note"
          disabled={isAdding}
        />
        <div>
          <Button type="submit" size="sm" className="gap-2" disabled={isAdding}>
            {isAdding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            Add note
          </Button>
        </div>
      </form>
    </div>
  );
}