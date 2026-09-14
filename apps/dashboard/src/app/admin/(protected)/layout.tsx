import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-h-0">
        <SiteHeader />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
