"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Activity, Mail, Search, StickyNote, UserRound } from "lucide-react";

import { globalSearchAction } from "@/app/admin/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CrmSearchResults } from "@/lib/admin/dashboard";

/**
 * Kinetra CRM — global search (Phase 7).
 *
 * ⌘K / Ctrl-K command palette over Leads, Emails, Notes, and Activities.
 * Queries run through the globalSearchAction server action (session-checked,
 * sanitized ilike across four tables); every result routes to the matching
 * lead's workspace. Composes Dialog + Command directly so cmdk's client-side
 * filtering can be disabled (shouldFilter={false}) — the server already
 * ranked the results.
 */

const EMPTY_RESULTS: CrmSearchResults = {
  leads: [],
  emails: [],
  notes: [],
  activities: [],
};

const DEBOUNCE_MS = 250;

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CrmSearchResults>(EMPTY_RESULTS);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ⌘K / Ctrl-K opens the palette.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Debounced server search.
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setResults(EMPTY_RESULTS);
      return;
    }

    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const res = await globalSearchAction(query);
        if (res.ok) {
          setResults(res.results);
        }
      });
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open]);

  function go(leadId: string) {
    setOpen(false);
    setQuery("");
    setResults(EMPTY_RESULTS);
    router.push(`/admin/leads/${leadId}`);
  }

  const hasAny =
    results.leads.length > 0 ||
    results.emails.length > 0 ||
    results.notes.length > 0 ||
    results.activities.length > 0;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 gap-2 text-muted-foreground"
        onClick={() => setOpen(true)}
        aria-label="Search the CRM"
      >
        <Search className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Search CRM…</span>
        <kbd className="pointer-events-none hidden rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground sm:inline-block">
          ⌘K
        </kbd>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden border-border bg-card p-0 sm:max-w-lg">
          <DialogHeader className="sr-only">
            <DialogTitle>Search the CRM</DialogTitle>
            <DialogDescription>
              Search leads, emails, notes, and activity.
            </DialogDescription>
          </DialogHeader>
          <Command shouldFilter={false} className="bg-transparent">
            <CommandInput
              placeholder="Search leads, emails, notes, activity…"
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty>
                {query.trim().length < 2
                  ? "Type at least 2 characters."
                  : isPending
                    ? "Searching…"
                    : "No results."}
              </CommandEmpty>

              {hasAny ? (
                <>
                  {results.leads.length > 0 ? (
                    <CommandGroup heading="Leads">
                      {results.leads.map((hit) => (
                        <CommandItem
                          key={`lead-${hit.id}`}
                          value={`lead-${hit.id}`}
                          onSelect={() => go(hit.id)}
                        >
                          <UserRound className="h-4 w-4" aria-hidden="true" />
                          <span className="truncate">{hit.name}</span>
                          <span className="ml-auto truncate font-mono text-[10px] text-muted-foreground">
                            {hit.email}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ) : null}

                  {results.emails.length > 0 ? (
                    <CommandGroup heading="Emails">
                      {results.emails.map((hit) => (
                        <CommandItem
                          key={`email-${hit.id}`}
                          value={`email-${hit.id}`}
                          onSelect={() => go(hit.leadId)}
                        >
                          <Mail className="h-4 w-4" aria-hidden="true" />
                          <span className="truncate">{hit.excerpt}</span>
                          <span className="ml-auto truncate font-mono text-[10px] text-muted-foreground">
                            {hit.leadName}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ) : null}

                  {results.notes.length > 0 ? (
                    <CommandGroup heading="Notes">
                      {results.notes.map((hit) => (
                        <CommandItem
                          key={`note-${hit.id}`}
                          value={`note-${hit.id}`}
                          onSelect={() => go(hit.leadId)}
                        >
                          <StickyNote className="h-4 w-4" aria-hidden="true" />
                          <span className="truncate">{hit.excerpt}</span>
                          <span className="ml-auto truncate font-mono text-[10px] text-muted-foreground">
                            {hit.leadName}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ) : null}

                  {results.activities.length > 0 ? (
                    <CommandGroup heading="Activity">
                      {results.activities.map((hit) => (
                        <CommandItem
                          key={`activity-${hit.id}`}
                          value={`activity-${hit.id}`}
                          onSelect={() => go(hit.leadId)}
                        >
                          <Activity className="h-4 w-4" aria-hidden="true" />
                          <span className="truncate">{hit.excerpt}</span>
                          <span className="ml-auto truncate font-mono text-[10px] text-muted-foreground">
                            {hit.leadName}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ) : null}
                </>
              ) : null}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}