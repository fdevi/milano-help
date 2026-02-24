import { Heart, MapPin, Mail, Phone, Facebook, Twitter, Instagram } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300 border-t border-gray-800">
      <div className="container mx-auto max-w-6xl px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo e descrizione */}
          <div className="col-span-1 md:col-span-1">
            <a href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Heart className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-heading font-extrabold text-lg text-white">
                Milano Help
              </span>
            </a>
            <p className="text-sm text-gray-400 mb-4">
              La community del tuo quartiere. Connetti, aiuta e cresci insieme ai tuoi vicini.
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <MapPin className="w-4 h-4" />
              <span>Milano, provincia e Monza Brianza</span>
            </div>
          </div>

          {/* Link Utili */}
          <div>
            <h3 className="font-heading font-bold text-white mb-4">Link Utili</h3>
            <ul className="space-y-2">
              <li>
                <a href="/registrati" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Registrati
                </a>
              </li>
              <li>
                <a href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Categorie
                </a>
              </li>
              <li>
                <a href="/how-it-works" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Come Funziona
                </a>
              </li>
              <li>
                <a href="/gruppi" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Gruppi
                </a>
              </li>
              <li>
                <a href="/eventi" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Eventi
                </a>
              </li>
            </ul>
          </div>

          {/* Supporto */}
          <div>
            <h3 className="font-heading font-bold text-white mb-4">Supporto</h3>
            <ul className="space-y-2">
              <li>
                <a href="/faq" className="text-sm text-gray-400 hover:text-white transition-colors">
                  FAQ
                </a>
              </li>
              <li>
                <a href="/donazioni" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Donazioni
                </a>
              </li>
              <li>
                <a href="/contatti" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Contattaci
                </a>
              </li>
              <li>
                <a href="/privacy" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="/termini" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Termini e Condizioni
                </a>
              </li>
            </ul>
          </div>

          {/* Contatti */}
          <div>
            <h3 className="font-heading font-bold text-white mb-4">Contatti</h3>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-gray-400">
                <Mail className="w-4 h-4" />
                <a href="mailto:info@milanohelp.it" className="hover:text-white transition-colors">
                  info@milanohelp.it
                </a>
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-400">
                <Phone className="w-4 h-4" />
                <a href="tel:+39021234567" className="hover:text-white transition-colors">
                  02 1234567
                </a>
              </li>
            </ul>
            <div className="flex items-center gap-3 mt-4">
              <a href="#" className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-primary/20 transition-colors">
                <Facebook className="w-4 h-4 text-gray-400" />
              </a>
              <a href="#" className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-primary/20 transition-colors">
                <Twitter className="w-4 h-4 text-gray-400" />
              </a>
              <a href="#" className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-primary/20 transition-colors">
                <Instagram className="w-4 h-4 text-gray-400" />
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} Milano Help. Tutti i diritti riservati.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;