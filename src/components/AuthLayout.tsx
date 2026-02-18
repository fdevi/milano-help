import TopNavbar from "@/components/TopNavbar";
import AppSidebar from "@/components/AppSidebar";

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <TopNavbar />
      <AppSidebar />
      <main className="pt-16 pl-16 lg:pl-56 min-h-screen">
        <div className="mx-auto px-4 py-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AuthLayout;
