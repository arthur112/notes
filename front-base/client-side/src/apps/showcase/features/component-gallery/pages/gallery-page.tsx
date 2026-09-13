import type { ReactNode } from "react";

import { PageHeader } from "@/shared/components/ui/page-header";

import { PrimitiveGallery } from "../components/primitive-gallery";
import { PickerGallery } from "../components/picker-gallery";
import { FormDemo } from "../components/form-demo";
import { TableGallery } from "../components/table-gallery";

function GallerySection({
  name,
  note,
  children,
}: {
  name: string;
  note: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border pb-2">
        <h2 className="text-base font-semibold tracking-tight">{name}</h2>
        <p className="text-sm text-muted-foreground">{note}</p>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Components app — a living gallery of the shared/ui + shared components. */
export function GalleryPage() {
  return (
    <div className="space-y-10">
      <PageHeader
        title="Components"
        description="Everything here lives in shared/ and is what keeps the Ops and Finance apps looking the same while staying totally decoupled."
      />

      <GallerySection
        name="1 · Primitives"
        note="shadcn-style base components from shared/components/ui"
      >
        <PrimitiveGallery />
      </GallerySection>

      <GallerySection
        name="2 · Pickers & selects"
        note="Dumb, controlled — Finance uses MonthPicker, Ops uses DateRangePicker; all of them accept any value/onChange. MultiSelect is a fixed chips combobox: pick enough projects to watch it wrap — one row visible with the next peeking through a fade — and scroll vertically with the scrollbar hidden and Clear pinned in place."
      >
        <PickerGallery />
      </GallerySection>

      <GallerySection
        name="3 · Bound to a form"
        note="TanStack Form fields wired to the dumb pickers — validation errors come from zod via the standard-schema validator."
      >
        <FormDemo />
      </GallerySection>

      <GallerySection
        name="4 · Data table & async states"
        note="One shared DataTable over TanStack Table v9; the skeleton/empty/error pattern every query page reuses."
      >
        <TableGallery />
      </GallerySection>
    </div>
  );
}
