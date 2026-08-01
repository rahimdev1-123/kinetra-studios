"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { saveSettingsAction } from "@/app/admin/(dashboard)/settings/actions";
import {
  SettingsSaveRow,
  SettingsSection,
} from "@/components/admin/settings/settings-section";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
  appearanceSettingsSchema,
  type AppearanceSettings,
} from "@/lib/admin/settings-schemas";

/**
 * Kinetra CRM — Appearance settings tab (Phase 9).
 *
 * Admin-panel display preferences stored in admin_settings. These are studio
 * defaults dashboards can read; the PUBLIC site's design is untouched by
 * everything in this module.
 */

const RANGE_LABELS: Record<AppearanceSettings["dashboard"]["default_range"], string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  "12m": "Last 12 months",
};

export function AppearanceSettingsForm({
  initial,
}: {
  initial: AppearanceSettings;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const form = useForm<AppearanceSettings>({
    resolver: zodResolver(appearanceSettingsSchema),
    defaultValues: initial,
  });

  const onSubmit = (values: AppearanceSettings) => {
    startTransition(async () => {
      const result = await saveSettingsAction("appearance", values);
      if (!result.ok) {
        toast({ title: "Couldn't save", description: result.error });
        return;
      }
      toast({ title: "Appearance settings saved" });
      form.reset(values);
      router.refresh();
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <SettingsSection
          title="Admin panel display"
          description="Stored studio defaults for the admin surfaces. The public website is not affected."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="density"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Density</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="border-border bg-background">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="comfortable">Comfortable</SelectItem>
                      <SelectItem value="compact">Compact</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dashboard.default_range"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default analytics range</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="border-border bg-background">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(
                        Object.keys(RANGE_LABELS) as Array<
                          keyof typeof RANGE_LABELS
                        >
                      ).map((range) => (
                        <SelectItem key={range} value={range}>
                          {RANGE_LABELS[range]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="charts.show_legend"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <FormLabel>Chart legends</FormLabel>
                    <FormDescription>
                      Show legends on analytics charts.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-label="Show chart legends"
                    />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <SettingsSaveRow isPending={isPending} />
        </SettingsSection>
      </form>
    </Form>
  );
}