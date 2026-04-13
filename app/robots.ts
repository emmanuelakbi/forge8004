import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://forge8004.com";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/brand", "/pitch", "/social-kit"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
