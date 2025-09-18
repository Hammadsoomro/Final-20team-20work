import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Settings as SettingsIcon,
  Shield,
  SortAsc,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { logout } from "@/lib/auth";
import { getTotalUnread, onUnreadChange } from "@/lib/chatState";

export default function AppLayout() {
  const navigate = useNavigate();
  const { user, logout: authLogout } = useAuth();
  const { pathname } = useLocation();
  const [unread, setUnread] = useState(0);

  const isActive = (path: string) => pathname === path;
  const canUseSorter = user?.role === "admin" || user?.role === "scrapper";

  useEffect(() => {
    setUnread(getTotalUnread());
    const off = onUnreadChange(() => setUnread(getTotalUnread()));
    return () => off();
  }, []);

  // Lock body scrolling so only the app content scrolls
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" variant="floating">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="size-6 rounded-md bg-gradient-to-br from-indigo-500 to-emerald-400" />
            <div className="font-extrabold tracking-tight" style={{ marginLeft: '-1px' }}>Team-Work</div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Menu</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={isActive("/app")}
                    onClick={() => navigate("/app")}
                  >
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={isActive("/app/chat")}
                    onClick={() => navigate("/app/chat")}
                  >
                    <MessageCircle />
                    <span className="relative">
                      Team Chat
                      {unread > 0 && (
                        <span className="absolute -right-8 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
                          {unread}
                        </span>
                      )}
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {canUseSorter && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={isActive("/app/sorter")}
                      onClick={() => navigate("/app/sorter")}
                    >
                      <SortAsc />
                      <span>Number Sorter</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={isActive("/app/attendance")}
                    onClick={() => navigate("/app/attendance")}
                  >
                    <BarChart3 />
                    <span>Attendance</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={isActive("/app/sales")}
                    onClick={() => navigate("/app/sales")}
                  >
                    <BarChart3 />
                    <span>Sales Tracker</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {user?.role === "admin" && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={isActive("/app/admin")}
                      onClick={() => navigate("/app/admin")}
                    >
                      <Shield />
                      <span>Admin Panel</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={isActive("/app/settings")}
                    onClick={() => navigate("/app/settings")}
                  >
                    <SettingsIcon />
                    <span>Settings</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => {
                      logout();
                      authLogout();
                      navigate("/");
                    }}
                  >
                    <LogOut />
                    <span>Sign out</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <div className="sticky top-0 z-10 w-full backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="container flex h-14 items-center justify-between">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <span className="text-sm text-muted-foreground">
                {user ? `Signed in as ${user.name}` : ""}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
                Home
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  logout();
                  authLogout();
                  navigate("/");
                }}
              >
                <LogOut className="mr-1" /> Logout
              </Button>
            </div>
          </div>
        </div>
        <div className="container py-6" style={{ height: 'calc(100vh - 56px)', overflow: 'hidden' }}>
          <div style={{ height: '100%', overflow: 'auto' }}>
            <Outlet />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
