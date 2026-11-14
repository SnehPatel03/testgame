"use client";

import { X } from "lucide-react";
import { toast } from "sonner";
import { useActions, useGame } from "@/lib/game/store";

export function HostRoomControls() {
  const state = useGame((s) => s.state);
  const actions = useActions();

  if (!state?.me.isHost) return null;

  return (
    <button
      type="button"
      onClick={() => {
        if (!window.confirm("Close this room for everyone? All players will return home.")) return;
        actions.closeRoom((error) => {
          if (error) toast.error(error);
        });
      }}
      className="fixed z-40 right-4 top-[max(1rem,env(safe-area-inset-top))] flex min-h-10 items-center gap-1.5 rounded-full border border-red-500/30 bg-background/90 px-3 text-xs font-medium text-red-400 shadow-lg backdrop-blur active:scale-95"
      aria-label="Close room for everyone"
    >
      <X className="h-3.5 w-3.5" />
      Close room
    </button>
  );
}
