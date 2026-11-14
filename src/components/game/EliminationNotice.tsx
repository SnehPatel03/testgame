export function EliminationNotice({ message }: { message?: string | null }) {
  if (!message) return null;

  return (
    <div
      className="surface mb-5 rounded-xl border border-border/50 px-4 py-3 text-center"
      role="status"
      aria-live="polite"
    >
      <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        Last night
      </p>
      <p className="mt-1 text-sm font-medium">{message}</p>
    </div>
  );
}
