"use client";

import { useState, useCallback } from "react";

const DRAFT_KEY = "idea-store-draft";

function loadDraft(): string {
  try {
    return localStorage.getItem(DRAFT_KEY) || "";
  } catch {
    return "";
  }
}

export function useDraft() {
  const [text, setText] = useState(() => loadDraft());

  const save = useCallback((value: string) => {
    setText(value);
    try { localStorage.setItem(DRAFT_KEY, value); } catch {}
  }, []);

  const clear = useCallback(() => {
    setText("");
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
  }, []);

  return { draft: text, setDraft: save, clearDraft: clear };
}
