import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Warehouse,
  ArrowLeftRight,
  ShoppingCart,
  Truck,
  FileText,
  Receipt,
  Settings,
  ChevronDown,
  Box,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface NavSection {
  label: string;
  icon: React.ElementType;
  items?: { label: string; href: string; icon: React.ElementType }[];
  href?: string;
}

const navigation: NavSection[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    label: "Inventory",
    icon: Package,
    items: [
      { label: "Products", href: "/inventory/products", icon: Box },
      { label: "Warehouses", href: "/inventory/warehouses", icon: Warehouse },
      { label: "Movements", href: "/inventory/movements", icon: ArrowLeftRight },
    ],
  },
  {
    label: "Purchases",
    icon: Truck,
    items: [
      { label: "Purchase Orders", href: "/purchases/orders", icon: FileText },
      { label: "Suppliers", href: "/purchases/suppliers", icon: Truck },
    ],
  },
  {
    label: "Sales",
    icon: ShoppingCart,
    items: [
      { label: "Sales Orders", href: "/sales/orders", icon: FileText },
      { label: "Customers", href: "/sales/customers", icon: ShoppingCart },
    ],
  },
  {
    label: "Billing",
    icon: Receipt,
    items: [
      { label: "Invoices", href: "/billing/invoices", icon: Receipt },
      { label: "Quotes", href: "/billing/quotes", icon: FileText },
      { label: "Credit Notes", href: "/billing/credit-notes", icon: FileText },
    ],
  },
  { label: "Settings", href: "/settings", icon: Settings },
];

export const AppSidebar = () => {
  const location = useLocation();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    Inventory: true,
    Billing: true,
  });

  const toggleSection = (label: string) => {
    setExpanded((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const isActive = (href: string) => location.pathname === href;
  const isSectionActive = (section: NavSection) =>
    section.items?.some((item) => location.pathname.startsWith(item.href));

  return (
    <aside className="w-64 shrink-0 bg-sidebar text-sidebar-foreground flex flex-col h-screen border-r border-sidebar-border">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Box className="w-4.5 h-4.5 text-sidebar-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-sidebar-accent-foreground tracking-tight">
            StockFlow
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navigation.map((section) => {
          if (section.href) {
            return (
              <NavLink
                key={section.label}
                to={section.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive(section.href)
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <section.icon className="w-4 h-4" />
                {section.label}
              </NavLink>
            );
          }

          const sectionIsActive = isSectionActive(section);
          const isExpanded = expanded[section.label] || sectionIsActive;

          return (
            <div key={section.label}>
              <button
                onClick={() => toggleSection(section.label)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  sectionIsActive
                    ? "text-sidebar-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <span className="flex items-center gap-3">
                  <section.icon className="w-4 h-4" />
                  {section.label}
                </span>
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 transition-transform",
                    isExpanded && "rotate-180"
                  )}
                />
              </button>
              {isExpanded && section.items && (
                <div className="ml-4 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-3">
                  {section.items.map((item) => (
                    <NavLink
                      key={item.href}
                      to={item.href}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-colors",
                        isActive(item.href)
                          ? "bg-sidebar-accent text-sidebar-primary font-medium"
                          : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <item.icon className="w-3.5 h-3.5" />
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-semibold text-sidebar-primary">
            SF
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-accent-foreground truncate">
              Demo Workspace
            </p>
            <p className="text-xs text-sidebar-muted truncate">Owner</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
