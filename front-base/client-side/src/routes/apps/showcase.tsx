import { createFileRoute } from "@tanstack/react-router";
import { Shapes } from "lucide-react";

import { GalleryPage } from "../../apps/showcase/features/component-gallery/pages/gallery-page";

export const Route = createFileRoute("/apps/showcase")({
  component: GalleryPage,
  staticData: {
    nav: {
      title: "Components",
      description: "A living gallery of the shared UI and shared components both order apps reuse.",
      group: "Components",
      icon: Shapes,
    },
  },
});
