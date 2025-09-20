import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "@/context/AuthContext";
import RequireAuth from "@/pages/app/RequireAuth";
import AppLayout from "@/pages/app/Layout";
import DashboardHome from "@/pages/app/DashboardHome";
import TeamChat from "@/pages/app/TeamChat";
import NumberSorter from "@/pages/app/NumberSorter";
import Sales from "@/pages/app/Sales";
import AdminPanel from "@/pages/app/AdminPanel";
import Settings from "@/pages/app/Settings";
import Attendance from "@/pages/app/Attendance";
import RequireAdmin from "@/pages/app/RequireAdmin";

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
            <Route
              path="/app"
              element={
                <RequireAuth>
                  <AppLayout />
                </RequireAuth>
              }
            >
              <Route index element={<DashboardHome />} />
              <Route path="chat" element={<TeamChat />} />
              <Route path="sorter" element={<NumberSorter />} />
              <Route path="sales" element={<Sales />} />
              <Route path="attendance" element={<Attendance />} />
              <Route
                path="admin"
                element={
                  <RequireAuth>
                    <RequireAdmin>
                      <AdminPanel />
                    </RequireAdmin>
                  </RequireAuth>
                }
              />
              <Route path="settings" element={<Settings />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
