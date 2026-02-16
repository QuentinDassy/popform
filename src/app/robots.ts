import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard/", "/compte", "/api/", "/auth/", "/reset-password"],
      },
    ],
    sitemap: "https://popform-k2t5.vercel.app/sitemap.xml",
  };
}
