import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import { type BlogPost } from "@/types/admin";
import { Loader2 } from "lucide-react";

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const apiBase = import.meta.env.VITE_API_BASE || '/api';
        const response = await fetch(`${apiBase}/blog`);
        if (response.ok) {
          const data = await response.json();
          setPosts(data);
        }
      } catch (error) {
        console.error("Error fetching blog posts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  // Ordenar posts de más reciente a más antiguo usando fechas ISO
  const sortedPosts = [...posts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

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
      {/* SEO */}
      <SEO
        title="Blog"
        description="Artículos y consejos sobre marketing digital, branding, fotografía y tendencias creativas por Ethan Comunicaciones."
        keywords="blog marketing digital, branding, redes sociales, agencia creativa, contenido visual"
        url="https://www.agenciaethancomunicaciones.com/blog"
      />

      {/* Blog Content */}
      <section className="pt-32 pb-20 min-h-screen text-white bg-fondobody">
        <div className="max-w-6xl mx-auto px-6">
          <motion.h1
            className="text-3xl md:text-4xl font-bold text-center mb-6 text-naranjavivo"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Blog de Ethan Comunicaciones
          </motion.h1>

          <p className="text-center text-gray-100 max-w-2xl mx-auto mb-16">
            Inspírate, aprende y conoce las últimas tendencias del mundo
            digital, el branding, la fotografía y la creatividad.
          </p>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-12 w-12 animate-spin text-naranjavivo" />
            </div>
          ) : (
            /* Grid de artículos */
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {sortedPosts.map((post) => (
              <motion.article
                key={post.id}
                className="bg-black border border-white/10 shadow-lg rounded-2xl overflow-hidden hover:shadow-2xl transition-shadow duration-300 cursor-pointer group"
                whileHover={{ scale: 1.02 }}
              >
                <Link to={`/blog/${post.slug}`} className="block h-full">
                  <img
                    src={post.image || undefined}
                    alt={post.title}
                    className="w-full h-56 object-cover group-hover:opacity-90 transition-opacity"
                    loading="lazy"
                  />
                  <div className="p-6 text-left">
                    <p className="text-sm text-gray-200 mb-2">
                      {formatDate(post.date)}
                    </p>
                    <h2 className="text-lg font-semibold mb-2 group-hover:text-naranjavivo transition-colors">
                      {post.title}
                    </h2>
                    <p className="text-gray-400 text-sm mb-4">{post.excerpt}</p>
                    <span className="text-naranjavivo font-semibold group-hover:underline">
                      Leer más →
                    </span>
                  </div>
                </Link>
              </motion.article>
            ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
