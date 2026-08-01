"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  Download,
  Loader2,
  Mail,
  Plus,
} from "lucide-react";

import { createLeadAction } from "@/app/admin/(dashboard)/actions";
import { exportAnalyticsCsvAction } from "@/app/admin/(dashboard)/analytics/actions";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { LeadOption } from "@/lib/admin/dashboard";

/**
 * Kinetra CRM — dashboard quick actions (Phase 7).
 *
 * + New Lead (manual creation dialog → routes to the new lead),
 * Compose Email (lead picker → routes to the lead's detail workspace, where
 * the Phase 5 composer lives — no duplicate composer), Export CSV (REUSES
 * the Phase 6 export action, last 30 days), Analytics (link), and
 * Notifications (links to the Phase 8 notification center).
 */

const DAY_MS = 24 * 60 * 60 * 1000;

interface QuickActionsProps {
  recentLeads: LeadOption[];
}

function NewLeadDialog() {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    projectType: "",
    budgetRange: "",
    notes: "",
  });

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    startTransition(async () => {
      const result = await createLeadAction({
        name: form.name,
        email: form.email,
        company: form.company || undefined,
        projectType: form.projectType || undefined,
        budgetRange: form.budgetRange || undefined,
        notes: form.notes || undefined,
      });

      if (result.ok) {
        toast({
          title: "Lead created",
          description: `${form.name} was added and assigned to you.`,
        });
        setOpen(false);
        setForm({
          name: "",
          email: "",
          company: "",
          projectType: "",
          budgetRange: "",
          notes: "",
        });
        router.push(`/admin/leads/${result.leadId}`);
      } else {
        toast({
          title: "Couldn't create lead",
          description: result.error,
          variant: "destructive",
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" className="gap-2">
          <Plus className="h-4 w-4" aria-hidden="true" />
          New lead
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New lead</DialogTitle>
          <DialogDescription>
            Manually add a lead (source: manual). It gets assigned to you.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="nl-name" className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Name
            </Label>
            <Input
              id="nl-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              maxLength={100}
              required
              placeholder="Client name"
              disabled={isPending}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="nl-email" className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Email
            </Label>
            <Input
              id="nl-email"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              maxLength={254}
              required
              placeholder="client@company.com"
              disabled={isPending}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="nl-company" className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Company
              </Label>
              <Input
                id="nl-company"
                value={form.company}
                onChange={(e) => set("company", e.target.value)}
                maxLength={120}
                placeholder="Optional"
                disabled={isPending}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="nl-budget" className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Budget
              </Label>
              <Input
                id="nl-budget"
                value={form.budgetRange}
                onChange={(e) => set("budgetRange", e.target.value)}
                maxLength={100}
                placeholder="e.g. $2,500 – $5,000"
                disabled={isPending}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="nl-project" className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Service requested
            </Label>
            <Input
              id="nl-project"
              value={form.projectType}
              onChange={(e) => set("projectType", e.target.value)}
              maxLength={100}
              placeholder="e.g. Short-form editing"
              disabled={isPending}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="nl-notes" className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Context (optional)
            </Label>
            <Textarea
              id="nl-notes"
              rows={3}
              maxLength={5000}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="How did this lead come in?"
              disabled={isPending}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" onClick={submit} disabled={isPending} className="gap-2">
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="h-4 w-4" aria-hidden="true" />
            )}
            Create lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ComposeEmailPicker({ recentLeads }: { recentLeads: LeadOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline" className="gap-2">
          <Mail className="h-4 w-4" aria-hidden="true" />
          Compose email
        </Button>
      </DialogTrigger>
      <DialogContent className="border-border bg-card p-0 sm:max-w-md">
        <DialogHeader className="border-b border-border p-4 pb-3">
          <DialogTitle>Email a lead</DialogTitle>
          <DialogDescription>
            Pick a lead — the composer opens on their workspace.
          </DialogDescription>
        </DialogHeader>
        <Command className="bg-transparent">
          <CommandInput placeholder="Filter recent leads…" />
          <CommandList>
            <CommandEmpty>No matching lead.</CommandEmpty>
            <CommandGroup heading="Recent leads">
              {recentLeads.map((lead) => (
                <CommandItem
                  key={lead.id}
                  value={`${lead.name} ${lead.email}`}
                  onSelect={() => {
                    setOpen(false);
                    router.push(`/admin/leads/${lead.id}`);
                  }}
                >
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  <span className="truncate">{lead.name}</span>
                  <span className="ml-auto truncate font-mono text-[10px] text-muted-foreground">
                    {lead.email}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function ExportCsvButton() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      const now = new Date();
      const end = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
      );
      const result = await exportAnalyticsCsvAction({
        fromIso: new Date(end.getTime() - 30 * DAY_MS).toISOString(),
        toIso: end.toISOString(),
        source: "all",
      });

      if (!result.ok) {
        toast({
          title: "Export failed",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      toast({
        title: "Export ready",
        description: `${result.rowCount} lead${result.rowCount === 1 ? "" : "s"} from the last 30 days.`,
      });
    });
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="gap-2"
      onClick={run}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <Download className="h-4 w-4" aria-hidden="true" />
      )}
      Export CSV
    </Button>
  );
}

export function QuickActions({ recentLeads }: QuickActionsProps) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <NewLeadDialog />
      <ComposeEmailPicker recentLeads={recentLeads} />
      <ExportCsvButton />
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="gap-2"
        onClick={() => router.push("/admin/analytics")}
      >
        <BarChart3 className="h-4 w-4" aria-hidden="true" />
        Analytics
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="gap-2"
        onClick={() => router.push("/admin/notifications")}
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        Notifications
      </Button>
    </div>
  );
}