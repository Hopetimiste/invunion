import { 
  LayoutDashboard, 
  LogOut,
  Building2,
  ChevronLeft,
  ChevronRight,
  Menu,
  FileText,
  Cog,
  Settings,
  HelpCircle,
  Wallet,
  Bitcoin,
  Receipt,
  User,
  Users,
  Bell,
  Mail,
  CreditCard,
  Globe,
  ShieldCheck,
  KeyRound,
  Key,
  Webhook,
  ScrollText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getFirebaseAuth } from "@/lib/firebase";
import { signOut, Auth } from "firebase/auth";
import invunionLogoWhite from "@/assets/invunion-logo-white.png";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { TranslationKey } from "@/lib/translations";

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  labelKey: TranslationKey;
  path: string;
  adminOnly?: boolean;
}

interface SettingsCategory {
  labelKey: TranslationKey;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, labelKey: "nav.dashboard", path: "/app/onboarding" },
  { icon: Wallet, labelKey: "nav.transactions", path: "/app/transactions" },
  { icon: Bitcoin, labelKey: "nav.cryptoTransactions", path: "/app/crypto-transactions" },
  { icon: Receipt, labelKey: "nav.invoicesIssued", path: "/app/invoices-received" },
];

const settingsCategories: SettingsCategory[] = [
  {
    labelKey: "settings.account",
    icon: Building2,
    path: "/app/settings/account",
  },
  {
    labelKey: "settings.user",
    icon: User,
    path: "/app/settings/user",
  },
  {
    labelKey: "settings.technical",
    icon: Cog,
    path: "/app/settings/technical",
  },
];

const bottomNavItems: NavItem[] = [
  { icon: HelpCircle, labelKey: "nav.support", path: "/app/support" },
];

const adminItems: NavItem[] = [
  { icon: LayoutDashboard, labelKey: "nav.dashboard", path: "/admin", adminOnly: true },
];


interface AppLayoutProps {
  children: React.ReactNode;
  showAdminNav?: boolean;
}

export function AppLayout({ children, showAdminNav = false }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [auth, setAuth] = useState<Auth | null>(null);
  const settingsPanelRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, companyName } = useAuth();
  const { t } = useLanguage();

  // Check if we're on a settings page
  const isOnSettingsPage = location.pathname.startsWith("/app/settings");

  useEffect(() => {
    // Open settings panel if we're on a settings page
    if (isOnSettingsPage) {
      setSettingsOpen(true);
    }
  }, [location.pathname, isOnSettingsPage]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!settingsOpen) return;
      
      const target = event.target as Node;
      const clickedInsideSettingsPanel = settingsPanelRef.current?.contains(target);
      const clickedInsideSidebar = sidebarRef.current?.contains(target);
      
      if (!clickedInsideSettingsPanel && !clickedInsideSidebar) {
        setSettingsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [settingsOpen]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const firebaseAuth = await getFirebaseAuth();
        setAuth(firebaseAuth);
      } catch (err) {
        console.error("Failed to initialize Firebase Auth:", err);
      }
    };
    initAuth();
  }, []);

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
      navigate("/login");
    }
  };

  const handleSettingsClick = () => {
    setSettingsOpen(!settingsOpen);
  };

  const allNavItems = showAdminNav ? [...navItems, ...adminItems] : navItems;

  const SettingsPanel = () => (
    <div
      ref={settingsPanelRef}
      className={cn(
        "fixed top-0 h-screen bg-sidebar/95 backdrop-blur-sm border-r border-sidebar-border transition-all duration-300 ease-in-out flex flex-col z-30 overflow-hidden",
        collapsed ? "left-[72px]" : "left-64",
        settingsOpen ? "w-56 opacity-100" : "w-0 opacity-0"
      )}
    >
      <div className="h-20 flex items-center px-4 border-b border-sidebar-border">
        <h2 className="text-sm font-semibold text-sidebar-foreground">{t("nav.settings")}</h2>
      </div>
      <div className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {settingsCategories.map((category) => (
          <Link
            key={category.path}
            to={category.path}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
              location.pathname.startsWith(category.path)
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <category.icon className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm font-medium">{t(category.labelKey)}</span>
          </Link>
        ))}
      </div>
    </div>
  );

  const NavContent = () => (
    <>
      {/* Logo Section */}
      <div className="flex h-20 flex-col items-center justify-center px-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <img 
              src={invunionLogoWhite} 
              alt="INVUNION" 
              className={cn(
                "h-8 transition-all duration-300",
                collapsed ? "w-auto" : "h-8"
              )}
            />
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground transition-colors hidden lg:block"
          >
            <ChevronLeft
              className={cn(
                "h-4 w-4 transition-transform duration-300",
                collapsed && "rotate-180"
              )}
            />
          </button>
        </div>
        {!collapsed && (
          <p className="text-sm text-sidebar-foreground/80 mt-1 truncate w-full text-left animate-fade-in">
            {companyName || "My Entity"}
          </p>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {allNavItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
              location.pathname === item.path
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              collapsed && "justify-center px-2"
            )}
          >
            <item.icon className={cn(
              "h-5 w-5 flex-shrink-0 transition-colors",
              location.pathname === item.path && "text-sidebar-primary"
            )} />
            {!collapsed && (
              <span className="text-sm font-medium animate-fade-in">{t(item.labelKey)}</span>
            )}
          </Link>
        ))}
      </nav>

      {/* Bottom Navigation (Setting, Support) */}
      <div className="px-3 py-2 space-y-1">
        {/* Settings Button */}
        <button
          onClick={handleSettingsClick}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
            settingsOpen || isOnSettingsPage
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            collapsed && "justify-center px-2"
          )}
        >
          <Settings className={cn(
            "h-5 w-5 flex-shrink-0 transition-colors",
            (settingsOpen || isOnSettingsPage) && "text-sidebar-primary"
          )} />
          {!collapsed && (
            <span className="text-sm font-medium animate-fade-in">{t("nav.settings")}</span>
          )}
        </button>

        {/* Support Link */}
        {bottomNavItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
              location.pathname === item.path
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              collapsed && "justify-center px-2"
            )}
          >
            <item.icon className={cn(
              "h-5 w-5 flex-shrink-0 transition-colors",
              location.pathname === item.path && "text-sidebar-primary"
            )} />
            {!collapsed && (
              <span className="text-sm font-medium animate-fade-in">{t(item.labelKey)}</span>
            )}
          </Link>
        ))}
      </div>

      {/* User Profile & Logout */}
      <div className="p-3 border-t border-sidebar-border space-y-2">
        <div className={cn(
          "flex items-center gap-3 p-2 rounded-lg",
          collapsed && "justify-center"
        )}>
          <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-medium text-sidebar-accent-foreground">
              {user?.email?.[0].toUpperCase() || "U"}
            </span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0 animate-fade-in">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user?.email || "User"}
              </p>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive-foreground",
            collapsed && "justify-center px-2"
          )}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">{t("nav.logout")}</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside
        ref={sidebarRef}
        className={cn(
          "fixed left-0 top-0 z-40 h-screen bg-sidebar transition-all duration-300 ease-in-out flex-col hidden lg:flex",
          collapsed ? "w-[72px]" : "w-64"
        )}
      >
        <NavContent />
      </aside>

      {/* Settings Panel (Desktop) */}
      <div className="hidden lg:block">
        <SettingsPanel />
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-sidebar border-b border-sidebar-border z-40 flex items-center px-4">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-sidebar-foreground">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 bg-sidebar border-sidebar-border">
            <div className="flex flex-col h-full">
              <NavContent />
            </div>
          </SheetContent>
        </Sheet>
        <img 
          src={invunionLogoWhite} 
          alt="INVUNION" 
          className="ml-3 h-6"
        />
      </div>

      {/* Main Content */}
      <main className={cn(
        "transition-all duration-300 pt-16 lg:pt-0",
        collapsed 
          ? settingsOpen ? "lg:pl-[296px]" : "lg:pl-[72px]"
          : settingsOpen ? "lg:pl-[480px]" : "lg:pl-64"
      )}>
        {children}
      </main>
    </div>
  );
}
