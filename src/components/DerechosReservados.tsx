import {
  FaFacebook,
  FaInstagram,
  FaTiktok,
  FaYoutube,
  FaBehance,
} from "react-icons/fa";

const DerechosReservados = () => {
  return (
    <div className="bg-black py-4">
      <div className="flex justify-center space-x-6 text-white text-2xl mb-6">
        <a
          href="https://www.facebook.com/agenciaethancomunicaciones"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Facebook"
          className="hover:scale-110 transition-transform cursor-pointer"
        >
          <FaFacebook />
        </a>{" "}
        <a
          href="https://www.instagram.com/agenciaethancomunicaciones"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram"
          className="hover:scale-110 transition-transform cursor-pointer"
        >
          <FaInstagram />
        </a>
        <a
          href="https://www.tiktok.com/@agenciaethancomunicacion"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="TikTok"
          className="hover:scale-110 transition-transform cursor-pointer"
        >
          <FaTiktok />
        </a>
        <a
          href="https://www.youtube.com/@AgenciaEthanComunicaciones"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="YouTube"
          className="hover:scale-110 transition-transform cursor-pointer"
        >
          <FaYoutube />
        </a>
        <a
          href="https://www.behance.net/ethancomunic"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Behance"
          className="hover:scale-110 transition-transform cursor-pointer"
        >
          <FaBehance />
        </a>
      </div>

      <p className="text-sm text-gray-300">
        © 2025 Agencia Ethan Comunicaciones. Todos los derechos reservados.
      </p>
    </div>
  );
};

export default DerechosReservados;
