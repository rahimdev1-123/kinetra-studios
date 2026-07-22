"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Send, CheckCircle2, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Section } from "./section";
import { Reveal } from "./reveal";
import { PROJECT_TYPES, BUDGET_RANGES, CONTACT } from "@/lib/site-data";
import { cn } from "@/lib/utils";

type Status = "idle" | "submitting" | "success" | "error";
type FormState = {
  name: string;
  email: string;
  phone: string;
  handle: string;
  projectType: string;
  budget: string;
  message: string;
  company: string;
};

const EMPTY = {
  name: "",
  email: "",
  phone: "",
  handle: "",
  projectType: "",
  budget: "",
  message: "",
  company: "",
};
/**
 * Contact — 02:10 CONTACT
 * Posts to /api/contact (server-validated, persisted via Prisma).
 */
export function Contact() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [status, setStatus] = useState<Status>("idle");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const update = (key: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    // clear a field error as the user edits it
    if (fieldErrors[key]) {
      setFieldErrors((e) => {
        const next = { ...e };
        delete next[key];
        return next;
      });
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setFieldErrors({});

    let res: Response;
    try {
      res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } catch {
      setStatus("error");
      return;
    }

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.ok) {
      setStatus("success");
      setForm(EMPTY);
      return;
    }

    if (data.errors && typeof data.errors === "object") {
      setFieldErrors(data.errors as Record<string, string>);
    }
    setStatus("error");
  };

  return (
    <Section
      id="contact"
      tc="02:10"
      label="CONTACT"
      seconds={130}
      className="border-t border-border bg-secondary/20"
    >
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        {/* left — pitch */}
        <div>
          <Reveal>
            <h2 className="kin-display text-print text-4xl sm:text-5xl lg:text-6xl">
              Start a project
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 max-w-md text-base leading-relaxed text-print/75">
              Tell me what you&apos;re making. Footage, timeline, vibe —
              I&apos;ll reply within 48 hours with whether it&apos;s a fit and
              what it&apos;ll take.
            </p>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="kin-mono mt-8 text-[11px] uppercase tracking-[0.12em] text-ash">
              Direct email
            </p>
            <p className="mt-1 text-sm text-highlight">{CONTACT.email}</p>
          </Reveal>
        </div>

        {/* right — form / states */}
        <Reveal delay={0.1}>
          {status === "success" ? (
            <div
              role="status"
              className="flex h-full min-h-[20rem] flex-col items-center justify-center rounded-lg border border-highlight/40 bg-shadow p-8 text-center"
            >
              <CheckCircle2 className="size-10 text-highlight" />
              <p className="mt-4 text-lg font-medium text-print">
                {CONTACT.successMessage}
              </p>
              <Button
                variant="outline"
                onClick={() => setStatus("idle")}
                className="mt-6 rounded-none border-print/30 bg-transparent text-print hover:border-highlight hover:bg-transparent hover:text-highlight"
              >
                Send another
              </Button>
            </div>
          ) : (
            <form
              onSubmit={onSubmit}
              noValidate
              className="space-y-5 rounded-lg border border-border bg-shadow/60 p-6 sm:p-8"
            >
              {status === "error" && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-md border border-rec/40 bg-rec/10 p-3 text-sm text-print/90"
                >
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rec" />
                  <span>{CONTACT.errorMessage}</span>
                </div>
              )}

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Name" htmlFor="name" error={fieldErrors.name} required>
                  <Input
                    id="name"
                    name="name"
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="Your name"
                    aria-invalid={!!fieldErrors.name}
                    aria-describedby={fieldErrors.name ? "name-err" : undefined}
                    className="rounded-none bg-transparent"
                  />
                </Field>
                <Field label="Email" htmlFor="email" error={fieldErrors.email} required>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    placeholder="you@email.com"
                    aria-invalid={!!fieldErrors.email}
                    aria-describedby={fieldErrors.email ? "email-err" : undefined}
                    className="rounded-none bg-transparent"
                  />
                </Field>
              </div>

              <Field
                label="Instagram / TikTok handle (optional)"
                htmlFor="handle"
                error={fieldErrors.handle}
              >
                <Input
                  id="handle"
                  name="handle"
                  value={form.handle}
                  onChange={(e) => update("handle", e.target.value)}
                  placeholder="@yourhandle"
                  className="rounded-none bg-transparent"
                />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Project type" htmlFor="projectType" error={fieldErrors.projectType}>
                  <SelectField
                    value={form.projectType}
                    onChange={(v) => update("projectType", v)}
                    placeholder="Select a type"
                    options={PROJECT_TYPES}
                    ariaLabel="Project type"
                  />
                </Field>
                <Field label="Budget range" htmlFor="budget" error={fieldErrors.budget}>
                  <SelectField
                    value={form.budget}
                    onChange={(v) => update("budget", v)}
                    placeholder="Select a range"
                    options={BUDGET_RANGES}
                    ariaLabel="Budget range"
                  />
                </Field>
              </div>

              <Field label="Message" htmlFor="message" error={fieldErrors.message} required>
                <Textarea
                  id="message"
                  name="message"
                  value={form.message}
                  onChange={(e) => update("message", e.target.value)}
                  placeholder="What are you making? Footage, deadline, references…"
                  rows={5}
                  aria-invalid={!!fieldErrors.message}
                  aria-describedby={fieldErrors.message ? "message-err" : undefined}
                  className="min-h-28 rounded-none bg-transparent"
                />
              </Field>

              <Button
                type="submit"
                disabled={status === "submitting"}
                className="h-12 w-full rounded-none bg-highlight text-xs font-semibold uppercase tracking-[0.16em] text-primary-foreground transition-transform hover:scale-[1.01] hover:bg-highlight/90"
              >
                {status === "submitting" ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Sending
                  </>
                ) : (
                  <>
                    <Send className="size-4" />
                    Send it
                  </>
                )}
              </Button>
            </form>
          )}
        </Reveal>
      </div>
    </Section>
  );
}

/* ---------- small field wrapper ---------- */
function Field({
  label,
  htmlFor,
  error,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label
        htmlFor={htmlFor}
        className="kin-mono text-[11px] uppercase tracking-[0.12em] text-ash"
      >
        {label}
        {required && <span className="ml-1 text-rec">*</span>}
      </Label>
      <div className="mt-2">{children}</div>
      {error && (
        <p
          id={`${htmlFor}-err`}
          className="kin-mono mt-1.5 text-[11px] text-rec"
        >
          {error}
        </p>
      )}
    </div>
  );
}

/* ---------- styled select ---------- */
function SelectField({
  value,
  onChange,
  placeholder,
  options,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: string[];
  ariaLabel: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        aria-label={ariaLabel}
        className={cn(
          "h-9 w-full rounded-none bg-transparent font-sans text-sm",
          !value && "text-muted-foreground",
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="rounded-none border-border bg-popover text-popover-foreground">
        {options.map((o) => (
          <SelectItem key={o} value={o} className="rounded-none">
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
