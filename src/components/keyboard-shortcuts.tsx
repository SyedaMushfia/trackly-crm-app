"use client";

import { useEffect } from "react";

interface KeyboardShortcutsProps {
  onNewLead: () => void;
}

export function KeyboardShortcuts({ onNewLead }: KeyboardShortcutsProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore if user is typing in an input, textarea, or select
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;

      if (isTyping) return;

      // Press N to open new lead modal
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        onNewLead();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onNewLead]);

  return null;
}