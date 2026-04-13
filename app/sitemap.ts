import { MetadataRoute } from "next";
import { SEO_ROUTES, isInternalRoute } from "@/app/lib/seo-config";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://forge8004.com";
  return Object.keys(SEO_ROUTES)
    .filter((path) => !isInternalRoute(path) && !path.includes("["))
    .map((path) => ({
      url: `${baseUrl}${path}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: path === "/" ? 1.0 : 0.7,
    }));
}
