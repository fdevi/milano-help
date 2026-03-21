import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, Grid3X3, Briefcase, CalendarCheck, ScrollText, Heart, LogOut, ChevronLeft, ShieldAlert, Calendar, Mail, Megaphone, Download, ToggleLeft
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import BadgeNotifiche from "./BadgeNotifiche";
import { useRoleCheck } from "@/hooks/useRoleCheck";

const allNavItems = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", adminOnly: true },
  { to: "/admin/utenti", icon: Users, label: "Utenti", adminOnly: true },
  { to: "/admin/newsletter", icon: Mail, label: "Newsletter", adminOnly: true },
  { to: "/admin/categorie", icon: Grid3X3, label: "Categorie", adminOnly: true },
  { to: "/admin/servizi", icon: Briefcase, label: "Servizi", adminOnly: true },
  { to: "/admin/prenotazioni", icon: CalendarCheck, label: "Prenotazioni", adminOnly: true },
  { to: "/admin/annunci", icon: Megaphone, label: "Gestione Annunci", adminOnly: false },
  { to: "/admin/annunci-speciali", icon: Briefcase, label: "Annunci Speciali", adminOnly: true },
  { to: "/admin/approvazione-categorie", icon: ToggleLeft, label: "Approvaz. Categorie", adminOnly: true },
  { to: "/admin/moderazione", icon: ShieldAlert, label: "Moderazione", adminOnly: false, badgeTipo: "moderazione" as const },
  { to: "/admin/eventi", icon: Calendar, label: "Eventi", adminOnly: false, badgeTipo: "eventi" as const },
  { to: "/admin/importazioni", icon: Download, label: "Importazioni", adminOnly: true },
  { to: "/admin/log", icon: ScrollText, label: "Log Attività", adminOnly: true },
];

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

const AdminSidebar = ({ collapsed, onToggle }: Props) => {
  const location = useLocation();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <aside
      className={cn(
        "fixed top-0 left-0 h-screen bg-card border-r flex flex-col z-50 transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Header */}
      <div className="h-16 flex items-center px-4 border-b gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center shrink-0">
          <Heart className="w-4 h-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="font-heading font-extrabold text-sm text-foreground whitespace-nowrap">
            ADMIN PANEL
          </span>
        )}
        <button onClick={onToggle} className="ml-auto p-1 rounded hover:bg-muted transition-colors">
          <ChevronLeft className={cn("w-4 h-4 text-muted-foreground transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to || (item.to !== "/admin" && location.pathname.startsWith(item.to));
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && "badgeTipo" in item && item.badgeTipo && (
                <BadgeNotifiche tipo={item.badgeTipo} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t">
        <Link
          to="/home"  // ← MODIFICATO: era "/dashboard", ora è "/home"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors"
        >
          <ChevronLeft className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Torna all'app</span>}
        </Link>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Esci</span>}
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;