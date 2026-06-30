import { createFileRoute } from "@tanstack/react-router";
import { HowWeWork } from "@/components/HowWeWork";

export const Route = createFileRoute("/preview")({
  component: () => <HowWeWork />,
});
