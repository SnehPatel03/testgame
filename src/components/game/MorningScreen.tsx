"use client";

import { motion } from "framer-motion";
import { Sun } from "lucide-react";
import { FadeItem } from "@/components/game/PageTransition";
import { useGame } from "@/lib/game/store";

const EASE = [0.22, 1, 0.36, 1] as const;

export function MorningScreen() {
  const state = useGame((s) => s.state);
  if (!state) return null;
  const msg = state.room.morningMessage ?? "Dawn has broken.";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 max-w-md mx-auto">
      <FadeItem delay={0.05}>
        <motion.div
          initial={{ rotate: -10, scale: 0.85, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.8, ease: EASE }}
          className="w-24 h-24 rounded-full mx-auto flex items-center justify-center mb-6"
          style={{
            background: "linear-gradient(135deg, rgba(255,82,82,0.18), rgba(198,40,40,0.08))",
            border: "1px solid rgba(198,40,40,0.4)",
            boxShadow: "0 0 64px -12px rgba(198,40,40,0.55)",
          }}
          data-cursor="view"
        >
          <Sun className="w-10 h-10 text-[#FF5252]" />
        </motion.div>
      </FadeItem>

      <FadeItem delay={0.3}>
        <p className="text-[10px] uppercase tracking-[0.45em] text-muted-foreground mb-2 text-center">
          Morning · Round {state.room.round}
        </p>
        <h2 className="text-2xl font-medium leading-snug text-balance text-center">
          {msg}
        </h2>
        <p className="text-[11px] text-muted-foreground/60 mt-4 text-center tracking-wide">
          A winner vote will follow.
        </p>
      </FadeItem>
    </div>
  );
}
