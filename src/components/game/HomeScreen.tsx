"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Spinner } from "@/components/game/Spinner";
import { useActions, useGame } from "@/lib/game/store";
import { toast } from "sonner";

export function HomeScreen({
  ready,
  connectionError,
  onRetry,
}: {
  ready: boolean;
  connectionError?: string | null;
  onRetry?: () => void;
}) {
  const actions = useActions();
  const connected = useGame((s) => s.connected);
  const [tab, setTab] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = () => {
    if (busy || !connected || !ready) return;
    if (!name.trim() || name.trim().length < 2) {
      toast.error("Enter a name (2+ characters)");
      return;
    }
    if (tab === "join" && code.trim().length !== 5) {
      toast.error("Room code must be 5 characters");
      return;
    }

    setBusy(true);
    const onResult = (result: { ok: boolean; error?: string }) => {
      setBusy(false);
      if (!result.ok) toast.error(result.error ?? "Could not connect to the room");
    };

    if (tab === "create") actions.createRoom(name.trim(), onResult);
    else actions.joinRoom(code.trim().toUpperCase(), name.trim(), onResult);
  };

  return (
    <main className="home-screen min-h-screen flex flex-col items-center justify-center px-5 py-6">
      <div className="w-full max-w-sm">
        <header className="mb-7 flex flex-col items-center text-center">
          <img
            src="/logo.svg"
            alt=""
            aria-hidden="true"
            width={64}
            height={64}
            className="mb-3 h-14 w-14"
            draggable={false}
          />
          <h1 className="text-3xl font-semibold tracking-tight">Mafia</h1>
          <p className="mt-1 text-sm text-muted-foreground">A party game for every phone at the table</p>
        </header>

        <Card className="surface rounded-2xl border-border/60">
          <CardHeader className="pb-3 pt-4">
            <div className="flex rounded-xl bg-muted/30 p-1" role="tablist" aria-label="Room action">
              <TabButton active={tab === "create"} onClick={() => setTab("create")}>
                Create room
              </TabButton>
              <TabButton active={tab === "join"} onClick={() => setTab("join")}>
                Join room
              </TabButton>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pb-5">
            <div className="space-y-2">
              <label htmlFor="player-name" className="text-xs font-medium text-muted-foreground">
                Your name
              </label>
              <Input
                id="player-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && submit()}
                placeholder="e.g. Alex"
                maxLength={24}
                className="h-12 text-base bg-muted/30 border-border/60"
                autoComplete="nickname"
                enterKeyHint="go"
              />
            </div>

            {connectionError ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
                <p className="min-w-0 text-xs text-muted-foreground" role="status">
                  Reconnecting to game…
                </p>
                <button
                  type="button"
                  onClick={onRetry}
                  className="min-h-11 shrink-0 px-2 text-sm font-medium text-foreground underline underline-offset-4"
                >
                  Retry
                </button>
              </div>
            ) : !connected || !ready ? (
              <p className="text-center text-xs text-muted-foreground" role="status" aria-live="polite">
                Connecting to game…
              </p>
            ) : null}

            {tab === "join" && (
              <div className="space-y-2">
                <label htmlFor="room-code" className="text-xs font-medium text-muted-foreground">
                  Room code
                </label>
                <Input
                  id="room-code"
                  value={code}
                  onChange={(event) => setCode(event.target.value.toUpperCase().slice(0, 5))}
                  onKeyDown={(event) => event.key === "Enter" && submit()}
                  placeholder="ABCD1"
                  maxLength={5}
                  className="h-12 text-base font-mono tracking-[0.3em] uppercase text-center bg-muted/30 border-border/60"
                  autoComplete="off"
                  enterKeyHint="go"
                />
              </div>
            )}

            <Button
              onClick={submit}
              disabled={busy || !connected || !ready}
              className="h-12 w-full rounded-xl text-base font-semibold"
            >
              {busy ? (
                <><Spinner size={18} /><span className="ml-2">Connecting…</span></>
              ) : !connected || !ready ? (
                "Reconnecting…"
              ) : tab === "create" ? (
                "Create room"
              ) : (
                "Join room"
              )}
            </Button>
          </CardContent>
        </Card>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          No host · No login · Everyone plays on their phone
        </p>
      </div>
    </main>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`min-h-11 flex-1 rounded-lg border px-2 text-sm font-medium transition-colors ${
        active
          ? "border-primary/50 bg-primary/15 text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
