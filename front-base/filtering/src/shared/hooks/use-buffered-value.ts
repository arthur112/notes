import { useRef, useState } from "react";

/**
 * Buffers a control while it is being edited. Typing updates a local draft;
 * `commit` runs once the draft has been unchanged for `delayMs`, or right away
 * on blur. When nobody is editing, the control shows `value`, so a change made
 * elsewhere (Back/Forward) shows up without any syncing.
 */
export function useBufferedValue<T>(value: T, commit: (next: T) => void, delayMs = 350) {
  const [draft, setDraft] = useState<T | null>(null);
  const timer = useRef<number | undefined>(undefined);

  return {
    value: draft ?? value,
    onChange(next: T) {
      setDraft(next);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        timer.current = undefined;
        commit(next);
      }, delayMs);
    },
    onBlur() {
      if (timer.current !== undefined && draft !== null) {
        window.clearTimeout(timer.current);
        timer.current = undefined;
        commit(draft);
      }
      setDraft(null);
    },
  };
}
