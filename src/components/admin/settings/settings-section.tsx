import { Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Kinetra CRM — shared settings chrome (Phase 9).
 *
 * Every tab is built from these two pieces so the whole module reads as one
 * surface: a titled card section and a standard save row. Pure presentation,
 * design tokens only.
 */

export function SettingsSection({
  title,
  description,
  destructive = false,
  children,
}: {
  title: string;
  description?: string;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card
      className={cn(
        "border-border bg-card/40",
        destructive && "border-destructive/40",
      )}
    >
      <CardHeader>
        <CardTitle
          className={cn(
            "text-base font-semibold",
            destructive && "text-destructive",
          )}
        >
          {title}
        </CardTitle>
        {description ? (
          <CardDescription>{description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
  );
}

export function SettingsSaveRow({
  isPending,
  label = "Save changes",
  disabled = false,
}: {
  isPending: boolean;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex justify-end border-t border-border pt-4">
      <Button type="submit" size="sm" className="gap-2" disabled={isPending || disabled}>
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Save className="h-4 w-4" aria-hidden="true" />
        )}
        {label}
      </Button>
    </div>
  );
}