"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { saveNotificationPreferencesAction } from "@/app/admin/(dashboard)/notifications/actions";
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
  notificationPreferencesSchema,
  type NotificationPreferencesInput,
} from "@/lib/admin/settings-schemas";
import type { NotificationPreference } from "@/types/crm";

/**
 * Kinetra CRM — Notification preferences tab (Phase 9, Phase 8 data).
 *
 * Per-admin delivery preferences (notification_preferences table). The
 * realtime toggle is LIVE — it controls the shell's socket subscription on
 * the next page load. Email digests and browser push are stored policy;
 * their delivery pipelines are honest "not yet" flags, not silent no-ops.
 */

const HOUR_OFF = "off";

const hourOptions = Array.from({ length: 24 }, (_, h) => ({
  value: String(h),
  label: `${String(h).padStart(2, "0")}:00`,
}));

function hourToSelect(value: number | null): string {
  return value === null ? HOUR_OFF : String(value);
}

function selectToHour(value: string): number | null {
  return value === HOUR_OFF ? null : Number(value);
}

export function NotificationPreferencesForm({
  initial,
}: {
  initial: NotificationPreference;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const form = useForm<NotificationPreferencesInput>({
    resolver: zodResolver(notificationPreferencesSchema),
    defaultValues: {
      realtime_toggle: initial.realtime_toggle,
      email_toggle: initial.email_toggle,
      browser_toggle: initial.browser_toggle,
      digest_frequency:
        initial.digest_frequency === "daily" ||
        initial.digest_frequency === "weekly"
          ? initial.digest_frequency
          : "off",
      quiet_hours_start: initial.quiet_hours_start,
      quiet_hours_end: initial.quiet_hours_end,
    },
  });

  const onSubmit = (values: NotificationPreferencesInput) => {
    startTransition(async () => {
      const result = await saveNotificationPreferencesAction(values);
      if (!result.ok) {
        toast({ title: "Couldn't save", description: result.error });
        return;
      }
      toast({ title: "Notification preferences saved" });
      form.reset(values);
      router.refresh();
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <SettingsSection
          title="Delivery"
          description="How notifications reach you. These preferences are yours — each admin has their own."
        >
          <FormField
            control={form.control}
            name="realtime_toggle"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <FormLabel>Realtime updates</FormLabel>
                    <FormDescription>
                      Live badge updates and in-app toasts while you work.
                      Turning this off takes effect on your next page load.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-label="Enable realtime updates"
                    />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email_toggle"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <FormLabel>Email notifications</FormLabel>
                    <FormDescription>
                      Stored policy — the email delivery pipeline isn&apos;t
                      wired up yet, so nothing sends today.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-label="Enable email notifications"
                    />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="browser_toggle"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <FormLabel>Browser push</FormLabel>
                    <FormDescription>
                      Stored policy — browser push delivery isn&apos;t wired up
                      yet.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-label="Enable browser push"
                    />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="digest_frequency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Digest frequency</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="max-w-56 border-border bg-background">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="off">Off</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Summary cadence for the (future) email digest.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </SettingsSection>

        <SettingsSection
          title="Quiet hours"
          description="A stored do-not-disturb window for push/email delivery once those pipelines exist."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="quiet_hours_start"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Starts</FormLabel>
                  <Select
                    value={hourToSelect(field.value)}
                    onValueChange={(value) =>
                      field.onChange(selectToHour(value))
                    }
                  >
                    <FormControl>
                      <SelectTrigger className="border-border bg-background">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={HOUR_OFF}>Off</SelectItem>
                      {hourOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
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
              name="quiet_hours_end"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ends</FormLabel>
                  <Select
                    value={hourToSelect(field.value)}
                    onValueChange={(value) =>
                      field.onChange(selectToHour(value))
                    }
                  >
                    <FormControl>
                      <SelectTrigger className="border-border bg-background">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={HOUR_OFF}>Off</SelectItem>
                      {hourOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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