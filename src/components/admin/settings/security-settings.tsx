"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, ShieldAlert, XCircle } from "lucide-react";
import { useForm } from "react-hook-form";

import { saveSettingsAction } from "@/app/admin/(dashboard)/settings/actions";
import {
  SettingsSaveRow,
  SettingsSection,
} from "@/components/admin/settings/settings-section";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  securitySettingsSchema,
  type SecuritySettings,
} from "@/lib/admin/settings-schemas";

/**
 * Kinetra CRM — Security tab (Phase 9).
 *
 * Read-only posture overview (which server credentials are configured —
 * names only, never values — plus the recent audit trail from the Phase 4
 * lead_activities log) and the stored audit-retention policy. Session
 * security itself (middleware guard, DB allowlist, CSP, rate limiting) is
 * the Phase 1 machinery — untouched here.
 */

export interface AuditEventRow {
  id: string;
  type: string;
  leadId: string;
  actorLabel: string | null;
  createdAt: string;
}

export interface ApiKeyStatus {
  name: string;
  configured: boolean;
}

function formatEventType(type: string): string {
  const label = type.replaceAll("_", " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/* ───────────────────────── Retention form ──────────────────────────────── */

function RetentionForm({ initial }: { initial: SecuritySettings }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const form = useForm<SecuritySettings>({
    resolver: zodResolver(securitySettingsSchema),
    defaultValues: initial,
  });

  const onSubmit = (values: SecuritySettings) => {
    startTransition(async () => {
      const result = await saveSettingsAction("security", values);
      if (!result.ok) {
        toast({ title: "Couldn't save", description: result.error });
        return;
      }
      toast({ title: "Security settings saved" });
      form.reset(values);
      router.refresh();
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="audit_retention_days"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Audit log retention</FormLabel>
              <div className="flex items-center gap-2">
                <FormControl>
                  <Input
                    type="number"
                    min={7}
                    max={365}
                    value={field.value}
                    onChange={(event) =>
                      field.onChange(
                        event.target.value === ""
                          ? Number.NaN
                          : Number(event.target.value),
                      )
                    }
                    className="w-28 border-border bg-background"
                  />
                </FormControl>
                <span className="text-sm text-muted-foreground">days</span>
              </div>
              <FormDescription>
                Stored policy (7–365 days) for how long activity events should
                be kept. Nothing is deleted automatically today — enforcement
                is a maintenance job you can add later.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <SettingsSaveRow isPending={isPending} />
      </form>
    </Form>
  );
}

/* ─────────────────────── Security tab (export) ─────────────────────────── */

interface SecuritySettingsPanelProps {
  initial: SecuritySettings;
  apiKeys: ApiKeyStatus[];
  auditEvents: AuditEventRow[];
}

export function SecuritySettingsPanel({
  initial,
  apiKeys,
  auditEvents,
}: SecuritySettingsPanelProps) {
  return (
    <div className="flex flex-col gap-6">
      <SettingsSection
        title="Server credentials"
        description="Configuration status only — values live in environment variables and are never stored or shown here."
      >
        <ul className="flex flex-col divide-y divide-border" role="list">
          {apiKeys.map((key) => (
            <li
              key={key.name}
              className="flex items-center justify-between gap-3 py-2.5"
            >
              <span className="text-sm text-foreground">{key.name}</span>
              {key.configured ? (
                <Badge
                  variant="outline"
                  className="gap-1.5 border-border font-mono text-[9px] uppercase tracking-wider text-emerald-400"
                >
                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                  Configured
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="gap-1.5 border-destructive/40 font-mono text-[9px] uppercase tracking-wider text-destructive"
                >
                  <XCircle className="h-3 w-3" aria-hidden="true" />
                  Not set
                </Badge>
              )}
            </li>
          ))}
        </ul>
      </SettingsSection>

      <SettingsSection
        title="Recent audit activity"
        description="Latest events from the CRM activity log (lead_activities) — who did what, when."
      >
        {auditEvents.length === 0 ? (
          <div className="flex items-center gap-3 rounded-md border border-dashed border-border px-4 py-6">
            <ShieldAlert
              className="h-5 w-5 text-muted-foreground/50"
              aria-hidden="true"
            />
            <p className="text-sm text-muted-foreground">
              No activity recorded yet.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-border" role="list">
            {auditEvents.map((event) => (
              <li
                key={event.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm text-foreground">
                    {formatEventType(event.type)}
                    {event.actorLabel ? (
                      <span className="text-muted-foreground">
                        {" "}
                        · {event.actorLabel}
                      </span>
                    ) : null}
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
                    {formatDistanceToNow(new Date(event.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <Link
                  href={`/admin/leads/${event.leadId}`}
                  className="font-mono text-[11px] text-primary underline-offset-4 hover:underline"
                >
                  View lead
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SettingsSection>

      <SettingsSection
        title="Policies"
        description="Stored security policies for the studio."
      >
        <RetentionForm initial={initial} />
      </SettingsSection>
    </div>
  );
}