import React, { useEffect, useState } from "react";
import {
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";
import {
  Store as StoreIcon,
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  FileText,
  Settings,
} from "lucide-react";
import { supabase } from "../../config/supabase";
import RestaurantHome from "./RestaurantHome";
import Orders from "./Orders";
import Menu from "./Menu";
import Reports from "./Reports";
import RestaurantSettings from "./RestaurantSettings";

const RESTAURANT_SLUG = "krua-pa-toi";

const RestaurantDashboard: React.FC = () => {
  const location = useLocation();
  const [restaurant, setRestaurant] = useState<any>(null);

  useEffect(() => {
    const cached = localStorage.getItem("user");
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.restaurant_slug === RESTAURANT_SLUG) {
        setRestaurant(parsed);
        return;
      }
    }

    supabase
      .from("restaurants")
      .select("id, name, slug")
      .eq("slug", RESTAURANT_SLUG)
      .single()
      .then(({ data }) => {
        if (data) {
          const session = {
            restaurant_id: data.id,
            restaurant_name: data.name,
            restaurant_slug: data.slug,
          };
          localStorage.setItem("user", JSON.stringify(session));
          setRestaurant(session);
        }
      });
  }, []);

  if (!restaurant) return null;

  const navItems = [
    { path: "/restaurant", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/restaurant/orders", icon: ShoppingBag, label: "Orders" },
    { path: "/restaurant/menu", icon: UtensilsCrossed, label: "Menu" },
    { path: "/restaurant/reports", icon: FileText, label: "Reports" },
    { path: "/restaurant/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-bg-subtle">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-border sticky top-0 z-40">
        <div className="container-custom">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <StoreIcon className="w-8 h-8 text-accent" />
              <h1 className="text-lg font-bold text-text">
                {restaurant?.restaurant_name || "Restaurant"}
              </h1>
            </div>
          </div>
        </div>
      </nav>

      {/* Secondary Navigation */}
      <div className="bg-white border-b border-border">
        <div className="container-custom">
          <div className="flex space-x-1 overflow-x-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? "border-accent text-accent font-medium"
                      : "border-transparent text-text-secondary hover:text-text"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container-custom py-8">
        <Routes>
          <Route index element={<RestaurantHome />} />
          <Route path="orders" element={<Orders />} />
          <Route path="menu" element={<Menu />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<RestaurantSettings />} />
        </Routes>
      </div>
    </div>
  );
};

export default RestaurantDashboard;
