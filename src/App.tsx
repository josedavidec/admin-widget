import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
// Minimal suspense fallback — no timed loader

const EthanLanding = lazy(() => import("./pages/EthanLanding"));
const BlogPage = lazy(() => import("./pages/BlogPage"));
const PortafolioPage = lazy(() => import("./pages/PortafolioPage"));
const BrochurePage = lazy(() => import("./pages/BrochurePage"));
const MainLayout = lazy(() => import("./layouts/MainLayout"));
const BlogPostPage = lazy(() => import("./pages/BlogPostPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));

function App() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      {/* Suspense se monta desde el principio; fallback minimalista mientras carga lo lazy */}
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<EthanLanding />} />
          <Route path="blog" element={<BlogPage />} />
          <Route path="blog/:slug" element={<BlogPostPage />} />
          <Route path="portafolio" element={<PortafolioPage />} />
          <Route path="brochure" element={<BrochurePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </Suspense>
  );
}

export default App;
