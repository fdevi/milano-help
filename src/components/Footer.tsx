import { Heart, Mail } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-foreground text-background py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Heart className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-heading font-extrabold text-lg">MILANO HELP</span>
            </div>
            <p className="text-sm opacity-70">La community di quartiere per Milano. Connetti, aiuta, cresci insieme ai tuoi vicini.</p>
          </div>
          <div>
            <h4 className="font-heading font-bold mb-4">Link Utili</h4>
            <div className="flex flex-col gap-2 text-sm opacity-70">
              <Link to="/registrati" className="hover:opacity-100 transition-opacity">Registrati</Link>
              <a href="#categorie" className="hover:opacity-100 transition-opacity">Categorie</a>
              <a href="#come-funziona" className="hover:opacity-100 transition-opacity">Come Funziona</a>
            </div>
          </div>
          <div>
            <h4 className="font-heading font-bold mb-4">Collabora</h4>
            <p className="text-sm opacity-70 mb-3">Vuoi contribuire al progetto?</p>
            <a
              href="mailto:fabio.dvt@hotmail.com"
              className="inline-flex items-center gap-2 text-sm bg-primary/20 px-4 py-2 rounded-lg hover:bg-primary/30 transition-colors"
            >
              <Mail className="w-4 h-4" /> Contattaci
            </a>
          </div>
        </div>
        <div className="border-t border-background/10 mt-8 pt-8 text-center text-sm opacity-50">
          © 2026 Milano Help. Tutti i diritti riservati.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
