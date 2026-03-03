import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard/", "/compte/", "/api/"],
      },
    ],
    sitemap: "https://popform.fr/sitemap.xml",
  };
}
