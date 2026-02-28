// Force rebuild - 2026-02-17
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import NuovoEvento from "./pages/NuovoEvento";
import ModificaEvento from "./pages/ModificaEvento";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import Index from "./pages/Index";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import Chat from "./pages/Chat";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUtenti from "./pages/admin/AdminUtenti";
import AdminCategorie from "./pages/admin/AdminCategorie";
import AdminServizi from "./pages/admin/AdminServizi";
import AdminPrenotazioni from "./pages/admin/AdminPrenotazioni";
import AdminLog from "./pages/admin/AdminLog";
import AdminModerazione from "./pages/admin/AdminModerazione";
import AdminModAnnunci from "./pages/admin/AdminModAnnunci";
import AdminSegnalazioni from "./pages/admin/AdminSegnalazioni";
import AdminModStorico from "./pages/admin/AdminModStorico";
import Categories from "./pages/Categories";
import HowItWorks from "./pages/HowItWorks";
import MieiAnnunci from "./pages/MieiAnnunci";
import CategoriaPage from "./pages/CategoriaPage";
import AnnuncioPage from "./pages/AnnuncioPage";
import NuovoAnnuncio from "./pages/NuovoAnnuncio";
import Gruppi from "./pages/Gruppi";
import GruppoDetail from "./pages/GruppoDetail";
import Sezioni from "./pages/Sezioni";
import Profilo from "./pages/Profilo";
import Eventi from "./pages/Eventi";
import AdminEventi from "./pages/admin/AdminEventi";
import MieiEventi from "./pages/MieiEventi";
import Donazioni from "./pages/Donazioni";
import Contattaci from "./pages/Contattaci";
import Collabora from "./pages/Collabora";
import InvitaAmico from "./pages/InvitaAmico";
import FAQ from "./pages/FAQ";
import Servizi from "./pages/Servizi";
import ServizioPage from "./pages/ServizioPage";
import NuovoServizio from "./pages/NuovoServizio";
import MieiServizi from "./pages/MieiServizi";
import MieiPrenotazioni from "./pages/MieiPrenotazioni";
import MieiServiziPrenotati from "./pages/MieiServiziPrenotati";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/registrati" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/categoria/:nome" element={<CategoriaPage />} />
            <Route path="/annuncio/:id" element={<AnnuncioPage />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/gruppi" element={<Gruppi />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/termini" element={<Terms />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/gruppo/:id" element={<ProtectedRoute><GruppoDetail /></ProtectedRoute>} />
            <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/sezioni" element={<ProtectedRoute><Sezioni /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
            <Route path="/chat/:id" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/utenti" element={<AdminRoute><AdminUtenti /></AdminRoute>} />
            <Route path="/admin/categorie" element={<AdminRoute><AdminCategorie /></AdminRoute>} />
            <Route path="/admin/servizi" element={<AdminRoute><AdminServizi /></AdminRoute>} />
            <Route path="/admin/prenotazioni" element={<AdminRoute><AdminPrenotazioni /></AdminRoute>} />
            <Route path="/admin/log" element={<AdminRoute><AdminLog /></AdminRoute>} />
            <Route path="/admin/moderazione" element={<AdminRoute><AdminModerazione /></AdminRoute>} />
            <Route path="/admin/moderazione/annunci" element={<AdminRoute><AdminModAnnunci /></AdminRoute>} />
            <Route path="/admin/moderazione/segnalazioni" element={<AdminRoute><AdminSegnalazioni /></AdminRoute>} />
            <Route path="/admin/moderazione/storico" element={<AdminRoute><AdminModStorico /></AdminRoute>} />
            <Route path="/admin/eventi" element={<AdminRoute><AdminEventi /></AdminRoute>} />
            <Route path="/miei-annunci" element={<ProtectedRoute><MieiAnnunci /></ProtectedRoute>} />
            <Route path="/miei-eventi" element={<ProtectedRoute><MieiEventi /></ProtectedRoute>} />
            <Route path="/profilo" element={<ProtectedRoute><Profilo /></ProtectedRoute>} />
            <Route path="/eventi" element={<Navigate to="/categoria/evento" replace />} />
            <Route path="/nuovo-annuncio" element={<ProtectedRoute><NuovoAnnuncio /></ProtectedRoute>} />
            <Route path="/nuovo-evento" element={<ProtectedRoute><NuovoEvento /></ProtectedRoute>} />
            <Route path="/modifica-evento/:id" element={<ProtectedRoute><ModificaEvento /></ProtectedRoute>} />
            <Route path="/donazioni" element={<Donazioni />} />
            <Route path="/contattaci" element={<Contattaci />} />
            <Route path="/collabora" element={<Collabora />} />
            <Route path="/invita" element={<InvitaAmico />} />
            <Route path="/faq" element={<FAQ />} />
            {/* Servizi & Prenotazioni */}
            <Route path="/servizi" element={<ProtectedRoute><Servizi /></ProtectedRoute>} />
            <Route path="/servizio/:id" element={<ProtectedRoute><ServizioPage /></ProtectedRoute>} />
            <Route path="/nuovo-servizio" element={<ProtectedRoute><NuovoServizio /></ProtectedRoute>} />
            <Route path="/miei-servizi" element={<ProtectedRoute><MieiServizi /></ProtectedRoute>} />
            <Route path="/miei-prenotazioni" element={<ProtectedRoute><MieiPrenotazioni /></ProtectedRoute>} />
            <Route path="/miei-servizi-prenotati" element={<ProtectedRoute><MieiServiziPrenotati /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
