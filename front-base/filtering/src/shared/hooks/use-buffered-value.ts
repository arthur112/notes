import { useEffect, useRef, useState } from "react";

/**
 * Buffers a control while it is being edited. Typing updates a local draft;
 * `commit` runs once the draft has been unchanged for `delayMs`, or right away
 * on blur. When nobody is editing, the control shows `value`, so a change made
 * elsewhere (Back/Forward) shows up without any syncing. A commit still pending
 * on unmount is dropped, so leaving the page never navigates back to it.
 */
export function useBufferedValue<T>(value: T, commit: (next: T) => void, delayMs = 350) {
  // Boxed, so a draft equal to `null` still counts as a draft.
  const [draft, setDraft] = useState<{ value: T } | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return {
    value: draft ? draft.value : value,
    onChange(next: T) {
      setDraft({ value: next });
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        timer.current = undefined;
        commit(next);
      }, delayMs);
    },
    onBlur() {
      if (timer.current !== undefined && draft) {
        window.clearTimeout(timer.current);
        timer.current = undefined;
        commit(draft.value);
      }
      setDraft(null);
    },
  };
}
