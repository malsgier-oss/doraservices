import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Store,
  Tag,
  Flag,
  Settings,
  MessageSquare,
  History,
  ArrowLeft,
  Menu,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/providers", label: "Providers", icon: Users },
  { to: "/admin/services", label: "Services", icon: Store },
  
  { to: "/admin/reviews", label: "Reviews", icon: MessageSquare },
  { to: "/admin/categories", label: "Categories", icon: Tag },
  { to: "/admin/cities", label: "Cities", icon: Flag },
  { to: "/admin/sub-cities", label: "Sub-Cities", icon: MapPin },
  { to: "/admin/reports", label: "Reports", icon: Flag },
  { to: "/admin/messages", label: "Messages", icon: MessageSquare },
  { to: "/admin/analytics", label: "Analytics", icon: LayoutDashboard },
  { to: "/admin/media", label: "Media", icon: Store },
  { to: "/admin/bulk-upload", label: "Bulk Upload", icon: Settings },
  { to: "/admin/settings", label: "Settings", icon: Settings },
  { to: "/admin/audit-log", label: "Audit Log", icon: History },
];

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 border-r bg-card min-h-screen p-4 hidden md:block">
          <div className="mb-6">
            <NavLink to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to App</span>
            </NavLink>
          </div>
          <div className="mb-6">
            <h2 className="text-xl font-display font-bold text-foreground">Admin Panel</h2>
            <p className="text-sm text-muted-foreground">The Circle</p>
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Mobile Header */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Open admin menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-4">
                  <SheetHeader>
                    <SheetTitle className="font-display">Admin Panel</SheetTitle>
                  </SheetHeader>
                  <nav className="mt-4 space-y-1">
                    {navItems.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          )
                        }
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </NavLink>
                    ))}
                  </nav>
                </SheetContent>
              </Sheet>

              <h2 className="font-display font-bold">Admin Panel</h2>
            </div>

            <NavLink to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Exit
              </Button>
            </NavLink>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 p-6 md:p-8 mt-16 md:mt-0">
          <Outlet />
        </main>
      </div>

      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t p-2 flex justify-around">
        {navItems.slice(0, 5).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center p-2 rounded-lg text-xs",
                isActive ? "text-primary" : "text-muted-foreground"
              )
            }
          >
            <item.icon className="h-5 w-5" />
            <span className="mt-1">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
