import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import SEO from "@/components/SEO";
import AdBannerSlider from "@/components/AdBannerSlider";
import { type BlogPost } from "@/types/admin";
import { Loader2 } from "lucide-react";

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [recommendedPosts, setRecommendedPosts] = useState<BlogPost[]>([]);

  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true);
      try {
        const apiBase = import.meta.env.VITE_API_BASE || '/api';
        const response = await fetch(`${apiBase}/blog`);
        if (response.ok) {
          const allPosts: BlogPost[] = await response.json();
          const foundPost = allPosts.find(p => p.slug === slug);
          setPost(foundPost || null);
          
          if (foundPost) {
             const others = allPosts
              .filter((p) => p.slug !== slug)
              .sort(() => Math.random() - 0.5)
              .slice(0, 3);
             setRecommendedPosts(others);
          }
        }
      } catch (error) {
        console.error("Error fetching blog post:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-fondobody text-white">
        <Loader2 className="h-12 w-12 animate-spin text-naranjavivo" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="pt-32 text-center text-white min-h-screen bg-fondobody">
        <h2 className="text-2xl font-bold">Artículo no encontrado 😕</h2>
        <Link to="/blog" className="text-naranjavivo hover:underline mt-4 block">Volver al blog</Link>
      </div>
    );
  }

  // Formateador de fecha para mostrar en español
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    });
  };

  return (
    <>
      <SEO
        title={post.title}
        description={post.description || ''}
        image={post.image || undefined}
        url={`https://www.agenciaethancomunicaciones.com/blog/${post.slug}`}
        type="article"
        schema={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          image: post.image || undefined,
          author: {
            "@type": "Organization",
            name: "Agencia Ethan Comunicaciones",
          },
          publisher: {
            "@type": "Organization",
            name: "Agencia Ethan Comunicaciones",
            logo: {
              "@type": "ImageObject",
              url: "https://www.agenciaethancomunicaciones.com/logo.png",
            },
          },
          datePublished: post.date, // Note: Date format should ideally be ISO 8601
          description: post.description,
        }}
      />

      <div className="hidden md:block pt-21">
        <AdBannerSlider />
      </div>

      <div className="pt-32 md:pt-12 pb-20 max-w-6xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row gap-12 text-left">
          <article className="flex-1 max-w-3xl">
            <Link
              to="/blog"
              className="inline-flex items-center text-naranjavivo hover:text-white transition-colors mb-6 font-medium group"
            >
              <span className="mr-2 group-hover:-translate-x-1 transition-transform">
                ←
              </span>{" "}
              Volver al Blog
            </Link>

            <div className="w-full h-64 md:h-[400px] mb-10 rounded-2xl overflow-hidden shadow-2xl">
              <img
                src={post.image || undefined}
                alt={post.title}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
              />
            </div>

            <header className="mb-10 border-b border-gray-800 pb-8">
              <h1 className="text-3xl md:text-5xl font-bold text-naranjavivo mb-6 leading-tight">
                {post.title}
              </h1>
              <p className="text-lg text-gray-300 font-medium">
                {formatDate(post.date)}
              </p>
            </header>

            <div
              className="prose prose-lg prose-invert max-w-none text-gray-100"
              dangerouslySetInnerHTML={{ __html: post.content || '' }}
            />
          </article>

          <aside className="mt-12 lg:mt-0 lg:w-80 xl:w-96 shrink-0">
            <div className="sticky top-32 space-y-6">
              
              {recommendedPosts.length > 0 && (
                <section className="rounded-2xl border border-white/10 bg-black/40 p-6 shadow-2xl backdrop-blur">
                  <h2 className="text-xl font-semibold text-white">
                    También te puede interesar
                  </h2>
                  <div className="mt-5 space-y-4">
                    {recommendedPosts.map((recommended) => (
                      <Link
                        key={recommended.slug}
                        to={`/blog/${recommended.slug}`}
                        className="group block rounded-xl border border-white/5 bg-white/5 p-4 transition-colors hover:border-naranjavivo hover:bg-white/10"
                      >
                        <div className="flex gap-4">
                          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg">
                            <img
                              src={recommended.image || undefined}
                              alt={recommended.title}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-white group-hover:text-naranjavivo transition-colors">
                              {recommended.title}
                            </h3>
                            <p className="mt-1 text-xs text-gray-300">
                              {formatDate(recommended.date)}
                            </p>
                            <p className="mt-2 text-xs text-gray-400 line-clamp-2">
                              {recommended.description}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
