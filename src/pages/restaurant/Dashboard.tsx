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
import CryptoJS from "crypto-js";
import { supabase } from "../../config/supabase";
import RestaurantHome from "./RestaurantHome";
import Orders from "./Orders";
import Menu from "./Menu";
import Reports from "./Reports";
import RestaurantSettings from "./RestaurantSettings";

const RESTAURANT_SLUG = "krua-pa-toi";
const PIN_HASH = CryptoJS.SHA256("021244").toString();
const Store = StoreIcon;

const PinScreen: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const handleKey = (digit: string) => {
    if (pin.length >= 6) return;
    const next = pin + digit;
    setPin(next);
    setError(false);

    if (next.length === 6) {
      if (CryptoJS.SHA256(next).toString() === PIN_HASH) {
        sessionStorage.setItem("pin_verified", "1");
        onSuccess();
      } else {
        setTimeout(() => {
          setPin("");
          setError(true);
        }, 300);
      }
    }
  };

  const handleDelete = () => {
    setPin((p) => p.slice(0, -1));
    setError(false);
  };

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

  return (
    <div className="min-h-screen bg-bg-subtle flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-80 text-center">
        <Store className="w-10 h-10 text-accent mx-auto mb-4" />
        <h2 className="text-xl font-bold text-text mb-1">เข้าสู่ระบบ</h2>
        <p className="text-sm text-text-secondary mb-6">กรอก PIN เพื่อดำเนินการต่อ</p>

        {/* Dots */}
        <div className="flex justify-center space-x-3 mb-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-colors ${
                i < pin.length
                  ? error ? "bg-red-500" : "bg-accent"
                  : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-sm text-red-500 mb-4">PIN ไม่ถูกต้อง กรุณาลองใหม่</p>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3">
          {keys.map((key, i) =>
            key === "" ? (
              <div key={i} />
            ) : key === "del" ? (
              <button
                key={i}
                onClick={handleDelete}
                className="h-14 rounded-xl bg-gray-100 text-text font-medium text-sm hover:bg-gray-200 transition-colors"
              >
                ⌫
              </button>
            ) : (
              <button
                key={i}
                onClick={() => handleKey(key)}
                className="h-14 rounded-xl bg-gray-100 text-text font-semibold text-xl hover:bg-gray-200 transition-colors"
              >
                {key}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};

const RestaurantDashboard: React.FC = () => {
  const location = useLocation();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [pinVerified, setPinVerified] = useState(
    () => sessionStorage.getItem("pin_verified") === "1"
  );

  useEffect(() => {
    if (!pinVerified) return;

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
  }, [pinVerified]);

  if (!pinVerified) {
    return <PinScreen onSuccess={() => setPinVerified(true)} />;
  }

  if (!restaurant) return null;

  const navItems = [
    { path: "/restaurant", icon: LayoutDashboard, label: "หน้าหลัก" },
    { path: "/restaurant/orders", icon: ShoppingBag, label: "ออเดอร์" },
    { path: "/restaurant/menu", icon: UtensilsCrossed, label: "เมนู" },
    { path: "/restaurant/reports", icon: FileText, label: "รายงาน" },
    { path: "/restaurant/settings", icon: Settings, label: "ตั้งค่า" },
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
