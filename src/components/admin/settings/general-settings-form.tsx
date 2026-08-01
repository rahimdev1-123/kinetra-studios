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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  generalSettingsSchema,
  type GeneralSettings,
} from "@/lib/admin/settings-schemas";

/**
 * Kinetra CRM — General settings tab (Phase 9).
 *
 * Studio identity + locale defaults, validated by the SAME zod schema the
 * server action re-checks (src/lib/admin/settings-schemas.ts) — client and
 * server can never drift.
 */

export function GeneralSettingsForm({ initial }: { initial: GeneralSettings }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const form = useForm<GeneralSettings>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: initial,
  });

  const onSubmit = (values: GeneralSettings) => {
    startTransition(async () => {
      const result = await saveSettingsAction("general", values);
      if (!result.ok) {
        toast({ title: "Couldn't save", description: result.error });
        return;
      }
      toast({ title: "General settings saved" });
      form.reset(values);
      router.refresh();
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <SettingsSection
          title="Studio profile"
          description="Identity used across the admin panel and stored exports."
        >
          <FormField
            control={form.control}
            name="company_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    maxLength={120}
                    placeholder="Kinetra Studios"
                    className="border-border bg-background"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="business_info"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Business info</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    rows={3}
                    maxLength={2000}
                    placeholder="Address, registration, tagline — anything worth keeping on file."
                    className="border-border bg-background"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </SettingsSection>

        <SettingsSection
          title="Locale & working hours"
          description="Defaults for dates, currency labels, and availability."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timezone</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      maxLength={64}
                      placeholder="e.g. Europe/Lisbon"
                      className="border-border bg-background"
                    />
                  </FormControl>
                  <FormDescription>IANA name, e.g. UTC.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      maxLength={8}
                      placeholder="USD"
                      className="border-border bg-background"
                    />
                  </FormControl>
                  <FormDescription>ISO code, e.g. USD.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Language</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      maxLength={16}
                      placeholder="en"
                      className="border-border bg-background"
                    />
                  </FormControl>
                  <FormDescription>BCP-47 tag, e.g. en.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="working_hours.start"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Workday starts</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="time"
                      className="border-border bg-background"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="working_hours.end"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Workday ends</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="time"
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