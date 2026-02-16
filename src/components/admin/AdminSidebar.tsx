import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, Grid3X3, Briefcase, CalendarCheck, ScrollText, Heart, LogOut, ChevronLeft
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/utenti", icon: Users, label: "Utenti" },
  { to: "/admin/categorie", icon: Grid3X3, label: "Categorie" },
  { to: "/admin/servizi", icon: Briefcase, label: "Servizi" },
  { to: "/admin/prenotazioni", icon: CalendarCheck, label: "Prenotazioni" },
  { to: "/admin/log", icon: ScrollText, label: "Log Attività" },
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
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t">
        <Link
          to="/dashboard"
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
