import { createFileRoute } from "@tanstack/react-router";
import NovaBlaster from "@/components/NovaBlaster";

const title = "NOVA BLASTER — Arcade Space Shooter";
const description =
  "Blast through waves of alien fighters and giant bosses in NOVA BLASTER, a fast neon arcade space shooter you can play free in your browser.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return <NovaBlaster />;
}
