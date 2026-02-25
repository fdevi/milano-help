import { Home, LayoutList, Users, CalendarDays, PlusCircle, Settings, Mail, Handshake, Heart, MessageCircle, Briefcase } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { cn } from "@/lib/utils";

const mainItems = [
  { title: "Home", url: "/home", icon: Home },
  { title: "Sezioni", url: "/sezioni", icon: LayoutList },
  { title: "Gruppi", url: "/gruppi", icon: Users },
  { title: "Eventi", url: "/eventi", icon: CalendarDays },
  { title: "Servizi", url: "/servizi", icon: Briefcase },
  { title: "Pubblica", url: "/nuovo-annuncio", icon: PlusCircle },
  { title: "Chat", url: "/chat", icon: MessageCircle },
];

const bottomItems = [
  { title: "Impostazioni", url: "/impostazioni", icon: Settings },
  { title: "Invita un amico", url: "/invita", icon: Mail },
  { title: "Collabora", url: "/collabora", icon: Handshake },
  { title: "Donazioni", url: "/donazioni", icon: Heart },
];

const SidebarLink = ({ item }: { item: (typeof mainItems)[0] }) => {
  const location = useLocation();
  const isActive = location.pathname === item.url;
  return (
    <Link
      to={item.url}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors text-sm font-medium",
        isActive && "bg-sidebar-accent text-sidebar-primary font-semibold"
      )}
    >
      <item.icon className="w-5 h-5 shrink-0" />
      <span className="hidden lg:inline">{item.title}</span>
    </Link>
  );
};

const AppSidebar = () => {
  const { isAdmin } = useAdminCheck();
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-16 lg:w-56 bg-sidebar border-r border-sidebar-border z-40 flex flex-col">
      <nav className="flex-1 px-2 lg:px-3 py-4 space-y-1">
        {mainItems.map((item) => (
          <SidebarLink key={item.url} item={item} />
        ))}
        {isAdmin && (
          <Link
            to="/admin"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors text-sm font-medium",
              location.pathname.startsWith("/admin") && "bg-sidebar-accent text-sidebar-primary font-semibold"
            )}
          >
            <Settings className="w-5 h-5 shrink-0" />
            <span className="hidden lg:inline">Admin</span>
          </Link>
        )}
      </nav>

      <div className="border-t border-sidebar-border px-2 lg:px-3 py-4 space-y-1">
        {bottomItems.map((item) => (
          <SidebarLink key={item.url} item={item} />
        ))}
      </div>
    </aside>
  );
};

export default AppSidebar;