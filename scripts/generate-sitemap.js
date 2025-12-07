import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = "https://www.agenciaethancomunicaciones.com";
const BLOG_DATA_PATH = path.join(__dirname, "../src/data/BlogPost.ts");
const PUBLIC_DIR = path.join(__dirname, "../public");
const SITEMAP_PATH = path.join(PUBLIC_DIR, "sitemap.xml");

// Static routes
const staticRoutes = ["/", "/blog", "/portafolio", "/brochure"];

function getBlogSlugs() {
  try {
    const content = fs.readFileSync(BLOG_DATA_PATH, "utf-8");
    const slugRegex = /slug:\s*"([^"]+)"/g;
    const slugs = [];
    let match;

    while ((match = slugRegex.exec(content)) !== null) {
      slugs.push(match[1]);
    }
    return slugs;
  } catch (error) {
    console.error("Error reading blog data:", error);
    return [];
  }
}

function generateSitemap() {
  const blogSlugs = getBlogSlugs();
  const today = new Date().toISOString().split("T")[0];

  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

  // Add static routes
  staticRoutes.forEach((route) => {
    sitemap += `  <url>
    <loc>${BASE_URL}${route === "/" ? "" : route}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${route === "/" ? "1.0" : "0.8"}</priority>
  </url>
`;
  });

  // Add blog routes
  blogSlugs.forEach((slug) => {
    sitemap += `  <url>
    <loc>${BASE_URL}/blog/${slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
`;
  });

  sitemap += `</urlset>`;

  fs.writeFileSync(SITEMAP_PATH, sitemap);
  console.log(`✅ Sitemap generated at ${SITEMAP_PATH}`);
}

generateSitemap();
