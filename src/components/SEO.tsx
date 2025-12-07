import { Helmet } from "react-helmet-async";

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: "website" | "article";
  author?: string;
  schema?: object;
  canonical?: string;
  robots?: string; // "index,follow" | "noindex,nofollow"
}

export default function SEO({
  title,
  description,
  keywords,
  image = "https://www.agenciaethancomunicaciones.com/preview.jpg",
  url = "https://www.agenciaethancomunicaciones.com/",
  type = "website",
  author = "Agencia Ethan Comunicaciones",
  schema,
  canonical,
  robots = "index,follow",
}: SEOProps) {
  const siteTitle = "Agencia Ethan Comunicaciones";
  const fullTitle = title === siteTitle ? title : `${title} | ${siteTitle}`;
  // Idioma: lee del DOM si está disponible; por defecto 'es'
  const lang =
    (typeof document !== "undefined" && document.documentElement.lang) || "es";

  return (
    <Helmet prioritizeSeoTags htmlAttributes={{ lang }}>
      {/* Standard Metadata */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <meta name="author" content={author} />
      <meta name="robots" content={robots} />
      <link rel="canonical" href={canonical || url} />

      {/* Open Graph (Facebook, WhatsApp, LinkedIn) */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:locale" content={lang === "en" ? "en_US" : "es_CO"} />
      <meta property="og:site_name" content={siteTitle} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:creator" content="@ethancomunic" />
      <meta name="twitter:site" content="@ethancomunic" />

      {/* Structured Data (JSON-LD) */}
      {schema && (
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      )}
    </Helmet>
  );
}
