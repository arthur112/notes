/**
 * The one size every form control shares (text, number, select, date), so a
 * filter bar and a form built from these controls line up the same way.
 * Width comes from the container; the control fills it.
 */
export const CONTROL_CLASS = "h-9 w-full";

/** Forwarded to the control so a form's `<label htmlFor>` and error text can point at it. */
export type ControlProps = {
  id?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  disabled?: boolean;
  className?: string;
};
