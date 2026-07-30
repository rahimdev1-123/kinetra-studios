"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLeadsUrl } from "./use-leads-url";

/**
 * Kinetra CRM — leads search box (Phase 3).
 *
 * Debounced, URL-driven: typing updates the `q` param (page resets), the
 * server component re-queries, and the keyed Suspense boundary streams the
 * fresh table in. Feels instant; stays shareable.
 */

const DEBOUNCE_MS = 300;

interface LeadSearchProps {
  defaultValue: string;
}

export function LeadSearch({ defaultValue }: LeadSearchProps) {
  const { update, isPending } = useLeadsUrl();
  const [value, setValue] = useState(defaultValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAppliedRef = useRef(defaultValue);

  // Keep the input in sync when the URL changes from elsewhere
  // (e.g. "Clear all filters" in the empty state).
  useEffect(() => {
    setValue(defaultValue);
    lastAppliedRef.current = defaultValue;
  }, [defaultValue]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function apply(next: string) {
    if (next === lastAppliedRef.current) return;
    lastAppliedRef.current = next;
    update({ q: next.trim() === "" ? null : next.trim() });
  }

  function handleChange(next: string) {
    setValue(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => apply(next), DEBOUNCE_MS);
  }

  function handleClear() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setValue("");
    apply("");
  }

  return (
    <div className="relative w-full max-w-sm">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        type="search"
        inputMode="search"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Search name, email, company…"
        aria-label="Search leads by name, email, or company"
        className="h-9 pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden"
      />
      <span className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center">
        {isPending ? (
          <Loader2
            className="h-4 w-4 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
        ) : value ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={handleClear}
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        ) : null}
      </span>
    </div>
  );
}