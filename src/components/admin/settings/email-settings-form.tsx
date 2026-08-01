"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

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
  emailSettingsSchema,
  type EmailSettings,
} from "@/lib/admin/settings-schemas";

/**
 * Kinetra CRM — Email settings tab (Phase 9).
 *
 * Sender identity, signature, and branding stored with the CRM. NOTE:
 * transactional delivery keeps flowing through the EXISTING Resend
 * integration (RESEND_API_KEY / EMAIL_FROM env) — nothing here reroutes
 * sending. SMTP details are stored for reference/future use.
 */

/** Form variant: reply_to is an input field, "" means "not set" (→ null). */
const emailFormSchema = emailSettingsSchema.omit({ reply_to: true }).extend({
  reply_to: z.union([
    z.literal(""),
    z.string().trim().email("Enter a valid email.").max(254),
  ]),
});

type EmailFormValues = z.infer<typeof emailFormSchema>;

export function EmailSettingsForm({ initial }: { initial: EmailSettings }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const form = useForm<EmailFormValues>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: {
      ...initial,
      reply_to: initial.reply_to ?? "",
    },
  });

  const onSubmit = (values: EmailFormValues) => {
    startTransition(async () => {
      const result = await saveSettingsAction("email", {
        ...values,
        reply_to: values.reply_to === "" ? null : values.reply_to,
      });
      if (!result.ok) {
        toast({ title: "Couldn't save", description: result.error });
        return;
      }
      toast({ title: "Email settings saved" });
      form.reset(values);
      router.refresh();
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <SettingsSection
          title="Sender identity"
          description="Stored defaults for outbound email. Delivery itself keeps using the existing Resend configuration (RESEND_API_KEY / EMAIL_FROM)."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="sender_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sender name</FormLabel>
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
              name="sender_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sender email</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      maxLength={254}
                      placeholder="hello@kinetra.studio"
                      className="border-border bg-background"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="reply_to"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Reply-to{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    maxLength={254}
                    placeholder="Leave empty to use the sender address"
                    className="border-border bg-background"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="signature"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Signature</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    rows={3}
                    maxLength={2000}
                    placeholder="Appended to outbound emails."
                    className="border-border bg-background"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="branding.footer"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email footer</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    maxLength={300}
                    placeholder="Kinetra Studios — Edited for impact."
                    className="border-border bg-background"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </SettingsSection>

        <SettingsSection
          title="SMTP (reference)"
          description="Stored for reference or a future custom-SMTP setup — the app does not send through SMTP today, and no password is kept here."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="smtp.host"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Host</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      maxLength={255}
                      placeholder="smtp.example.com"
                      className="border-border bg-background"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="smtp.port"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Port</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={65535}
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

          <FormField
            control={form.control}
            name="smtp.username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    maxLength={255}
                    placeholder="Optional"
                    className="border-border bg-background"
                  />
                </FormControl>
                <FormDescription>
                  Credentials/secrets stay in environment variables — never in
                  the database.
                </FormDescription>
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