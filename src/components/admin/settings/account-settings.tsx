"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, formatDistanceToNow } from "date-fns";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  changePasswordAction,
  updateProfileAction,
} from "@/app/admin/(dashboard)/settings/actions";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

/**
 * Kinetra CRM — Users tab (Phase 9).
 *
 * Your profile (display name), password change (current password verified
 * server-side), and the read-only admin roster. Admin accounts are managed
 * through the Phase 1 Supabase allowlist (admin_users) — this tab shows the
 * roster; it deliberately does not create or delete accounts.
 */

export interface AdminAccountRow {
  id: string;
  label: string;
  email: string;
  role: string;
  createdAt: string;
  lastSignInAt: string | null;
}

/* ────────────────────────────── Profile ────────────────────────────────── */

const profileFormSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Display name is required.")
    .max(80, "Keep it under 80 characters."),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

function ProfileForm({
  initialDisplayName,
  email,
}: {
  initialDisplayName: string;
  email: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { displayName: initialDisplayName },
  });

  const onSubmit = (values: ProfileFormValues) => {
    startTransition(async () => {
      const result = await updateProfileAction(values);
      if (!result.ok) {
        toast({ title: "Couldn't update profile", description: result.error });
        return;
      }
      toast({ title: "Profile updated" });
      form.reset(values);
      router.refresh();
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display name</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  maxLength={80}
                  placeholder="How teammates see you"
                  className="border-border bg-background"
                />
              </FormControl>
              <FormDescription>
                Shown in the sidebar, notes, and the activity timeline.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <p className="text-sm font-medium text-foreground">Email</p>
          <p className="mt-1 font-mono text-sm text-muted-foreground">
            {email}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Sign-in email is managed in Supabase Auth.
          </p>
        </div>

        <SettingsSaveRow isPending={isPending} label="Save profile" />
      </form>
    </Form>
  );
}

/* ────────────────────────────── Password ───────────────────────────────── */

const passwordFormSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z
      .string()
      .min(8, "Use at least 8 characters.")
      .max(72, "Keep it under 72 characters."),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: "New password must differ from the current one.",
    path: ["newPassword"],
  });

type PasswordFormValues = z.infer<typeof passwordFormSchema>;

function PasswordForm() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = (values: PasswordFormValues) => {
    startTransition(async () => {
      const result = await changePasswordAction({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      if (!result.ok) {
        toast({ title: "Couldn't change password", description: result.error });
        return;
      }
      toast({
        title: "Password changed",
        description: "Your current session stays signed in.",
      });
      form.reset();
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="currentPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Current password</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="password"
                  autoComplete="current-password"
                  className="border-border bg-background"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New password</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="password"
                    autoComplete="new-password"
                    className="border-border bg-background"
                  />
                </FormControl>
                <FormDescription>At least 8 characters.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm new password</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="password"
                    autoComplete="new-password"
                    className="border-border bg-background"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <SettingsSaveRow isPending={isPending} label="Change password" />
      </form>
    </Form>
  );
}

/* ─────────────────────────── Users tab (export) ────────────────────────── */

interface AccountSettingsProps {
  selfId: string;
  displayName: string;
  email: string;
  admins: AdminAccountRow[];
}

export function AccountSettings({
  selfId,
  displayName,
  email,
  admins,
}: AccountSettingsProps) {
  return (
    <div className="flex flex-col gap-6">
      <SettingsSection
        title="Your profile"
        description="How you appear across the CRM."
      >
        <ProfileForm initialDisplayName={displayName} email={email} />
      </SettingsSection>

      <SettingsSection
        title="Password"
        description="Your current password is verified before the change is applied."
      >
        <PasswordForm />
      </SettingsSection>

      <SettingsSection
        title="Admin accounts"
        description="The allowlisted team. Accounts are added or removed via the Supabase admin_users allowlist from Phase 1 — not from this screen."
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Admin</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Last sign-in</TableHead>
                <TableHead className="text-right">Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.length === 0 ? (
                <TableRow className="border-border">
                  <TableCell
                    colSpan={4}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No admin accounts found.
                  </TableCell>
                </TableRow>
              ) : (
                admins.map((admin) => (
                  <TableRow key={admin.id} className="border-border">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {admin.label}
                          </p>
                          <p className="font-mono text-[11px] text-muted-foreground">
                            {admin.email}
                          </p>
                        </div>
                        {admin.id === selfId ? (
                          <Badge className="bg-primary/10 font-mono text-[9px] uppercase tracking-wider text-primary hover:bg-primary/10">
                            You
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="border-border font-mono text-[9px] uppercase tracking-wider text-muted-foreground"
                      >
                        {admin.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {admin.lastSignInAt
                        ? formatDistanceToNow(new Date(admin.lastSignInAt), {
                            addSuffix: true,
                          })
                        : "Never"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-[11px] text-muted-foreground">
                      {format(new Date(admin.createdAt), "PP")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </SettingsSection>
    </div>
  );
}