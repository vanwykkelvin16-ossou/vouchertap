import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Shared presentational building blocks for the admin create/edit popups so
 * Events, Breakfast, Vouchers and Shop all share one consistent, modern layout.
 * These are layout-only — no business logic lives here.
 */

/** Scrollable popup body. Use directly inside <DialogContent>.
 *  The `slk-form` class activates the Apple-style filled fields (styles.css). */
export function ModalBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("slk-form flex-1 overflow-y-auto px-6 md:px-8 py-7 space-y-8", className)}>
      {children}
    </div>
  );
}

/** A titled group of fields. */
export function FormSection({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      {title && (
        <h3 className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-semibold">
          {title}
        </h3>
      )}
      {children}
    </section>
  );
}

/** A single labelled field with optional required marker and helper hint. */
export function Field({
  label,
  hint,
  required,
  htmlFor,
  children,
  className,
}: {
  label?: string;
  hint?: ReactNode;
  required?: boolean;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <Label htmlFor={htmlFor}>
          {label}
          {required && <span className="text-primary"> *</span>}
        </Label>
      )}
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Two-column wrapper for side-by-side fields. */
export function FieldRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid gap-4 md:grid-cols-2", className)}>{children}</div>;
}

/** A paired date + time picker (the pattern repeated across events/breakfast/vouchers). */
export function DateTimeField({
  label,
  required,
  dateValue,
  timeValue,
  onDate,
  onTime,
}: {
  label: string;
  required?: boolean;
  dateValue: string;
  timeValue: string;
  onDate: (v: string) => void;
  onTime: (v: string) => void;
}) {
  return (
    <Field label={label} required={required}>
      <div className="grid grid-cols-2 gap-2">
        <Input type="date" value={dateValue} onChange={(e) => onDate(e.target.value)} />
        <Input type="time" value={timeValue} onChange={(e) => onTime(e.target.value)} />
      </div>
    </Field>
  );
}

/** An iOS-style setting row: label/description left, control right. */
export function ToggleRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-muted/50 px-4.5 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        {description && (
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/** Standardised frosted sticky footer: optional hint left, Cancel + pill Save right. */
export function ModalFooter({
  hint,
  onCancel,
  onSave,
  saving,
  saveLabel,
}: {
  hint?: ReactNode;
  onCancel: () => void;
  onSave: () => void;
  saving?: boolean;
  saveLabel: string;
}) {
  return (
    <DialogFooter className="px-6 md:px-8 py-4 border-t border-border/60 bg-background/85 backdrop-blur-xl shrink-0 sm:justify-between sm:items-center gap-3">
      {hint ? (
        <p className="hidden sm:block text-[11px] text-muted-foreground">{hint}</p>
      ) : (
        <span className="hidden sm:block" />
      )}
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          onClick={onCancel}
          className="rounded-full px-5 text-muted-foreground hover:text-foreground"
        >
          Cancel
        </Button>
        <Button
          onClick={onSave}
          disabled={saving}
          className="rounded-full h-11 px-8 font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/35 transition-shadow"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : saveLabel}
        </Button>
      </div>
    </DialogFooter>
  );
}
