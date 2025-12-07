import Header from "../components/Header";
import { Outlet } from "react-router-dom";
import ScrollManager from "@/components/ScrollManager";

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      {/* Gestor global de scroll: asegura que cada ruta carga al inicio */}
      <ScrollManager />
      <main>
        <Outlet /> {/* Aquí se renderizan las páginas */}
      </main>
    </div>
  );
}
