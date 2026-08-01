"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { saveSettingsAction } from "@/app/admin/(dashboard)/settings/actions";
import {
  SettingsSaveRow,
  SettingsSection,
} from "@/components/admin/settings/settings-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  crmSettingsSchema,
  type CrmSettings,
} from "@/lib/admin/settings-schemas";
import { LEAD_STATUS_LABELS, LEAD_STATUSES } from "@/types/crm";

/**
 * Kinetra CRM — CRM settings tab (Phase 9).
 *
 * Pipeline defaults, lead sources, archive automation policy, and lead
 * numbering. Pipeline STAGES are shown read-only: the status workflow is
 * defined by the application (src/types/crm.ts) and relabeling it from a
 * settings row would desync the UI from the state machine.
 */

const UNASSIGNED = "__none__";

/** Form variant: stages are managed by the app, not the form. */
const crmFormSchema = crmSettingsSchema.omit({ pipeline_stages: true });

type CrmFormValues = z.infer<typeof crmFormSchema>;

interface CrmSettingsFormProps {
  initial: CrmSettings;
  admins: { id: string; label: string }[];
}

export function CrmSettingsForm({ initial, admins }: CrmSettingsFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [newSource, setNewSource] = useState("");

  const form = useForm<CrmFormValues>({
    resolver: zodResolver(crmFormSchema),
    defaultValues: {
      lead_sources: initial.lead_sources,
      archive_rules: initial.archive_rules,
      default_owner: initial.default_owner,
      default_status: initial.default_status,
      lead_numbering: initial.lead_numbering,
    },
  });

  const leadSources = form.watch("lead_sources");
  const autoArchiveDays = form.watch("archive_rules.auto_archive_lost_after_days");

  const addSource = () => {
    const value = newSource.trim().toLowerCase();
    if (!value) return;
    if (leadSources.includes(value)) {
      setNewSource("");
      return;
    }
    form.setValue("lead_sources", [...leadSources, value], {
      shouldDirty: true,
      shouldValidate: true,
    });
    setNewSource("");
  };

  const removeSource = (source: string) => {
    form.setValue(
      "lead_sources",
      leadSources.filter((s) => s !== source),
      { shouldDirty: true, shouldValidate: true },
    );
  };

  const onSubmit = (values: CrmFormValues) => {
    startTransition(async () => {
      const result = await saveSettingsAction("crm", {
        ...values,
        pipeline_stages: initial.pipeline_stages,
      });
      if (!result.ok) {
        toast({ title: "Couldn't save", description: result.error });
        return;
      }
      toast({ title: "CRM settings saved" });
      form.reset(values);
      router.refresh();
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <SettingsSection
          title="Pipeline"
          description="Stage order is defined by the application workflow and shown here for reference."
        >
          <div className="flex flex-wrap items-center gap-2">
            {initial.pipeline_stages.map((stage, index) => (
              <span key={stage} className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-border font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
                >
                  {stage}
                </Badge>
                {index < initial.pipeline_stages.length - 1 ? (
                  <span className="text-muted-foreground/50" aria-hidden="true">
                    →
                  </span>
                ) : null}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="default_status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default status for new leads</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="border-border bg-background">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LEAD_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {LEAD_STATUS_LABELS[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="default_owner"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default owner</FormLabel>
                  <Select
                    value={field.value ?? UNASSIGNED}
                    onValueChange={(value) =>
                      field.onChange(value === UNASSIGNED ? null : value)
                    }
                  >
                    <FormControl>
                      <SelectTrigger className="border-border bg-background">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                      {admins.map((admin) => (
                        <SelectItem key={admin.id} value={admin.id}>
                          {admin.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Suggested assignee for incoming leads.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </SettingsSection>

        <SettingsSection
          title="Lead sources"
          description="Where leads come from — the contact form reports “website”; add the channels you track manually."
        >
          <FormField
            control={form.control}
            name="lead_sources"
            render={() => (
              <FormItem>
                <div className="flex flex-wrap gap-2">
                  {leadSources.map((source) => (
                    <Badge
                      key={source}
                      variant="outline"
                      className="gap-1.5 border-border py-1 pl-2.5 pr-1.5 font-mono text-[10px] uppercase tracking-wider text-foreground"
                    >
                      {source}
                      <button
                        type="button"
                        onClick={() => removeSource(source)}
                        aria-label={`Remove ${source}`}
                        className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <X className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    value={newSource}
                    onChange={(event) => setNewSource(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addSource();
                      }
                    }}
                    maxLength={40}
                    placeholder="e.g. referral"
                    aria-label="New lead source"
                    className="max-w-56 border-border bg-background"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 border-border"
                    onClick={addSource}
                    disabled={!newSource.trim()}
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    Add
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </SettingsSection>

        <SettingsSection
          title="Automation & numbering"
          description="Housekeeping policies stored with the CRM."
        >
          <FormField
            control={form.control}
            name="archive_rules.auto_archive_lost_after_days"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <FormLabel>Auto-archive lost leads</FormLabel>
                    <FormDescription>
                      Policy for how long lost leads stay in the active list.
                    </FormDescription>
                  </div>
                  <Switch
                    checked={field.value !== null}
                    onCheckedChange={(checked) =>
                      field.onChange(checked ? 30 : null)
                    }
                    aria-label="Enable auto-archive policy"
                  />
                </div>
                {field.value !== null ? (
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
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
                        aria-label="Days before auto-archive"
                      />
                    </FormControl>
                    <span className="text-sm text-muted-foreground">
                      days after a lead is marked lost
                    </span>
                  </div>
                ) : null}
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="lead_numbering.prefix"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lead reference prefix</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      maxLength={10}
                      placeholder="KIN-"
                      className="border-border bg-background"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lead_numbering.next"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Next number</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      value={field.value}
                      onChange={(event) =>
                        field.onChange(
                          event.target.value === ""
                            ? Number.NaN
                            : Number(event.target.value),
                        )
                      }
                      className="border-border bg-background"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <SettingsSaveRow isPending={isPending} />
        </SettingsSection>
      </form>
    </Form>
  );
}