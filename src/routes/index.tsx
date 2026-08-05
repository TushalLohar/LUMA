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
      { property: "og:url", content: "https://luma-arcade.lovable.app/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://luma-arcade.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "VideoGame",
          name: "NOVA BLASTER",
          description,
          url: "https://luma-arcade.lovable.app/",
          genre: ["Arcade", "Shoot 'em up"],
          playMode: "SinglePlayer",
          applicationCategory: "Game",
          operatingSystem: "Web browser",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        }),
      },
    ],
  }),
  component: Index,
});

function Index() {
  return <NovaBlaster />;
}
