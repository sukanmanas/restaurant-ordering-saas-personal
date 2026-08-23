import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  ShoppingCart,
  Plus,
  Minus,
  X,
  Search,
  CheckCircle,
  Package,
} from "lucide-react";
import {
  Card,
  Button,
  Input,
  Modal,
  Loading,
  Alert,
} from "../../components/ui";
import {
  subscribeToMenuItems,
  createOrder,
} from "../../services/restaurantService";
import type { MenuItem } from "../../config/supabase";
import { formatCurrency, isValidPhone } from "../../utils/helpers";
import { supabase } from "../../config/supabase";
import { type Language, t } from "../../i18n/translations";

interface CartItem extends MenuItem {
  quantity: number;
  selectedSize?: { name: string; price: number };
  selectedAddons: { name: string; price: number }[];
  itemTotal: number;
}

const LANGUAGES: { code: Language; label: string }[] = [
  { code: "th", label: "ไทย" },
  { code: "en", label: "EN" },
  { code: "zh", label: "中文" },
];

const getItemName = (item: MenuItem, lang: Language): string => {
  if (lang === "en" && item.name_en) return item.name_en;
  if (lang === "zh" && item.name_zh) return item.name_zh;
  return item.name;
};

const getItemDesc = (item: MenuItem, lang: Language): string | undefined => {
  if (lang === "en" && item.description_en) return item.description_en;
  if (lang === "zh" && item.description_zh) return item.description_zh;
  return item.description;
};

const CustomerMenu: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [lang, setLang] = useState<Language>(
    () => (localStorage.getItem("menu_lang") as Language) || "th"
  );
  const [restaurant, setRestaurant] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);

  const changeLang = (l: Language) => {
    setLang(l);
    localStorage.setItem("menu_lang", l);
  };

  useEffect(() => {
    loadRestaurant();
  }, [slug]);

  useEffect(() => {
    if (restaurant?.id) {
      const subscription = subscribeToMenuItems(restaurant.id, (data) => {
        setMenuItems(data);
        setLoading(false);
      });
      return () => { subscription.unsubscribe(); };
    }
  }, [restaurant]);

  const loadRestaurant = async () => {
    if (!slug) return;
    const { data, error } = await supabase
      .from("restaurants")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (error || !data) {
      setLoading(false);
      return;
    }
    setRestaurant(data);
  };

  const categories = [
    "all",
    ...new Set(menuItems.map((item) => item.category).filter(Boolean)),
  ];

  const filteredItems = menuItems.filter((item) => {
    const name = getItemName(item, lang).toLowerCase();
    const matchesSearch = name.includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || item.category === categoryFilter;
    return matchesSearch && matchesCategory && item.is_available;
  });

  const addToCart = (item: MenuItem, selectedSize?: any, selectedAddons: any[] = []) => {
    const basePrice = selectedSize ? selectedSize.price : item.base_price;
    const addonsTotal = selectedAddons.reduce((sum, addon) => sum + addon.price, 0);
    const itemTotal = basePrice + addonsTotal;

    const cartItem: CartItem = { ...item, quantity: 1, selectedSize, selectedAddons, itemTotal };

    const existingIndex = cart.findIndex(
      (ci) =>
        ci.id === item.id &&
        ci.selectedSize?.name === selectedSize?.name &&
        JSON.stringify(ci.selectedAddons) === JSON.stringify(selectedAddons)
    );

    if (existingIndex >= 0) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += 1;
      setCart(newCart);
    } else {
      setCart([...cart, cartItem]);
    }
    setShowItemModal(false);
  };

  const updateQuantity = (index: number, delta: number) => {
    const newCart = [...cart];
    newCart[index].quantity += delta;
    if (newCart[index].quantity <= 0) newCart.splice(index, 1);
    setCart(newCart);
  };

  const removeFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleItemClick = (item: MenuItem) => {
    if ((item.sizes && item.sizes.length > 0) || (item.addons && item.addons.length > 0)) {
      setSelectedItem(item);
      setShowItemModal(true);
    } else {
      addToCart(item);
    }
  };

  const handleRemoveItem = (itemId: string) => {
    const index = cart.findIndex((ci) => ci.id === itemId);
    if (index >= 0) updateQuantity(index, -1);
  };

  const getItemQuantity = (itemId: string) =>
    cart.reduce((sum, ci) => (ci.id === itemId ? sum + ci.quantity : sum), 0);

  if (loading) return <Loading text="Loading menu..." />;

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-bg-subtle flex items-center justify-center">
        <Card className="text-center p-8">
          <Package className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-50" />
          <h2 className="text-2xl font-bold text-text mb-2">{t(lang, "restaurantNotFound")}</h2>
          <p className="text-text-secondary">{t(lang, "restaurantNotFoundDesc")}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-screen-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              {restaurant.logo_url && (
                <img
                  src={restaurant.logo_url}
                  alt={restaurant.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              )}
              <div>
                <h1 className="font-bold text-lg text-gray-800">{restaurant.name}</h1>
                <p className="text-xs text-gray-500">{restaurant.restaurant_type}</p>
              </div>
            </div>

            {/* Language Switcher */}
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden shrink-0">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => changeLang(l.code)}
                  className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    lang === l.code
                      ? "bg-accent text-white"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t(lang, "searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="bg-white border-b sticky top-[116px] z-30">
        <div className="max-w-screen-lg mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto py-2 scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setCategoryFilter(category || "all")}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
                  categoryFilter === category
                    ? "bg-accent text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {category === "all" ? t(lang, "allCategory") : category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Grid */}
      <div className="max-w-screen-lg mx-auto px-4 py-4">
        {filteredItems.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-sm">{t(lang, "noItems")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredItems.map((item) => {
              const quantity = getItemQuantity(item.id);
              const hasVariations =
                (item.sizes && item.sizes.length > 0) ||
                (item.addons && item.addons.length > 0);

              return (
                <div key={item.id} className="bg-white rounded-xl overflow-hidden shadow-sm">
                  <div className="relative h-36">
                    {item.image_url ? (
                      <img src={item.image_url} alt={getItemName(item, lang)} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <Package className="w-10 h-10 text-gray-300" />
                      </div>
                    )}
                    {!item.is_available && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="bg-black/80 text-white text-xs px-2 py-1 rounded">
                          {t(lang, "notAvailable")}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-3">
                    <h3 className="font-semibold text-sm text-gray-800 mb-1 line-clamp-2 h-10">
                      {getItemName(item, lang)}
                    </h3>
                    <div className="flex items-end justify-between mt-2">
                      <p className="font-bold text-gray-800">
                        {item.sizes && item.sizes.length > 0
                          ? formatCurrency(Math.min(...item.sizes.map((s) => s.price)))
                          : formatCurrency(item.base_price)}
                      </p>
                      {item.is_available && (
                        <div className="flex-shrink-0">
                          {quantity === 0 ? (
                            <button
                              onClick={() => hasVariations ? handleItemClick(item) : addToCart(item)}
                              className="px-5 py-1.5 border-2 border-accent text-accent font-bold text-xs rounded-md hover:shadow-md transition-shadow"
                            >
                              {t(lang, "add")}
                            </button>
                          ) : (
                            <div className="flex items-center bg-accent text-white rounded-md">
                              <button onClick={() => handleRemoveItem(item.id)} className="px-2 py-1 hover:bg-accent-hover rounded-l-md">
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="px-3 font-bold text-sm">{quantity}</span>
                              <button
                                onClick={() => hasVariations ? handleItemClick(item) : addToCart(item)}
                                className="px-2 py-1 hover:bg-accent-hover rounded-r-md"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CartModal
        isOpen={showCart}
        cart={cart}
        lang={lang}
        onClose={() => setShowCart(false)}
        onUpdateQuantity={updateQuantity}
        onRemove={removeFromCart}
        onCheckout={() => { setShowCart(false); setShowCheckout(true); }}
        getItemName={getItemName}
      />

      <ItemCustomizationModal
        isOpen={showItemModal}
        item={selectedItem}
        lang={lang}
        onClose={() => setShowItemModal(false)}
        onAdd={addToCart}
        getItemName={getItemName}
        getItemDesc={getItemDesc}
      />

      <CheckoutModal
        isOpen={showCheckout}
        cart={cart}
        restaurantId={restaurant.id}
        lang={lang}
        onClose={() => setShowCheckout(false)}
        onSuccess={() => { setCart([]); setShowCheckout(false); }}
        getItemName={getItemName}
      />

      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-accent text-white shadow-[0_-2px_20px_rgba(0,0,0,0.15)] z-40">
          <button
            onClick={() => setShowCart(true)}
            className="max-w-screen-lg mx-auto w-full px-4 py-3.5 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white text-accent font-bold text-sm w-6 h-6 rounded flex items-center justify-center">
                {cartCount}
              </div>
              <span className="font-bold text-base">
                {formatCurrency(cart.reduce((sum, item) => sum + item.itemTotal * item.quantity, 0))}
              </span>
            </div>
            <div className="flex items-center gap-2 font-semibold text-sm">
              <span>{t(lang, "viewCart")}</span>
              <span className="text-lg">›</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

// Cart Modal
interface CartModalProps {
  isOpen: boolean;
  cart: CartItem[];
  lang: Language;
  onClose: () => void;
  onUpdateQuantity: (index: number, delta: number) => void;
  onRemove: (index: number) => void;
  onCheckout: () => void;
  getItemName: (item: MenuItem, lang: Language) => string;
}

const CartModal: React.FC<CartModalProps> = ({ isOpen, cart, lang, onClose, onUpdateQuantity, onRemove, onCheckout, getItemName }) => {
  const total = cart.reduce((sum, item) => sum + item.itemTotal * item.quantity, 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t(lang, "yourCart")} size="lg">
      <div className="space-y-6">
        {cart.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingCart className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-50" />
            <p className="text-text-secondary">{t(lang, "cartEmpty")}</p>
          </div>
        ) : (
          <>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {cart.map((item, index) => (
                <div key={index} className="flex items-start space-x-4 p-4 bg-bg-subtle rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-semibold text-text">{getItemName(item, lang)}</h4>
                    {item.selectedSize && (
                      <p className="text-sm text-text-secondary">{t(lang, "size")} {item.selectedSize.name}</p>
                    )}
                    {item.selectedAddons.length > 0 && (
                      <p className="text-sm text-text-secondary">{t(lang, "addons")} {item.selectedAddons.map((a) => a.name).join(", ")}</p>
                    )}
                    <p className="text-accent font-semibold mt-1">{formatCurrency(item.itemTotal)}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => onUpdateQuantity(index, -1)} className="p-1 rounded-full bg-border hover:bg-text-secondary/20">
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-semibold">{item.quantity}</span>
                    <button onClick={() => onUpdateQuantity(index, 1)} className="p-1 rounded-full bg-border hover:bg-text-secondary/20">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <button onClick={() => onRemove(index)} className="p-1 text-error hover:bg-error/10 rounded">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-4">
              <div className="flex justify-between text-xl font-bold text-text mb-4">
                <span>{t(lang, "total")}</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <Button onClick={onCheckout} fullWidth size="lg">{t(lang, "proceedToCheckout")}</Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

// Item Customization Modal
interface ItemCustomizationModalProps {
  isOpen: boolean;
  item: MenuItem | null;
  lang: Language;
  onClose: () => void;
  onAdd: (item: MenuItem, selectedSize?: any, selectedAddons?: any[]) => void;
  getItemName: (item: MenuItem, lang: Language) => string;
  getItemDesc: (item: MenuItem, lang: Language) => string | undefined;
}

const ItemCustomizationModal: React.FC<ItemCustomizationModalProps> = ({ isOpen, item, lang, onClose, onAdd, getItemName, getItemDesc }) => {
  const [selectedSize, setSelectedSize] = useState<any>(null);
  const [selectedAddons, setSelectedAddons] = useState<any[]>([]);

  useEffect(() => {
    if (item?.sizes && item.sizes.length > 0) setSelectedSize(item.sizes[0]);
    setSelectedAddons([]);
  }, [item]);

  if (!item) return null;

  const toggleAddon = (addon: any) => {
    if (selectedAddons.find((a) => a.name === addon.name)) {
      setSelectedAddons(selectedAddons.filter((a) => a.name !== addon.name));
    } else {
      setSelectedAddons([...selectedAddons, addon]);
    }
  };

  const calculateTotal = () => {
    const basePrice = selectedSize ? selectedSize.price : item.base_price;
    return basePrice + selectedAddons.reduce((sum, addon) => sum + addon.price, 0);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={getItemName(item, lang)} size="md">
      <div className="space-y-6">
        {item.image_url && (
          <img src={item.image_url} alt={getItemName(item, lang)} className="w-full h-48 object-cover rounded-lg" />
        )}
        {getItemDesc(item, lang) && (
          <p className="text-text-secondary">{getItemDesc(item, lang)}</p>
        )}

        {item.sizes && item.sizes.length > 0 && (
          <div>
            <h4 className="font-semibold text-text mb-3">{t(lang, "selectSize")}</h4>
            <div className="space-y-2">
              {item.sizes.map((size) => (
                <button
                  key={size.name}
                  onClick={() => setSelectedSize(size)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${
                    selectedSize?.name === size.name ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"
                  }`}
                >
                  <span className="font-medium text-text">{size.name}</span>
                  <span className="text-accent font-semibold">{formatCurrency(size.price)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {item.addons && item.addons.length > 0 && (
          <div>
            <h4 className="font-semibold text-text mb-3">{t(lang, "addonsOptional")}</h4>
            <div className="space-y-2">
              {item.addons.map((addon) => (
                <button
                  key={addon.name}
                  onClick={() => toggleAddon(addon)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${
                    selectedAddons.find((a) => a.name === addon.name) ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"
                  }`}
                >
                  <span className="font-medium text-text">{addon.name}</span>
                  <span className="text-accent font-semibold">+{formatCurrency(addon.price)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-border pt-4">
          <div className="flex justify-between text-xl font-bold text-text mb-4">
            <span>{t(lang, "total")}</span>
            <span>{formatCurrency(calculateTotal())}</span>
          </div>
          <Button onClick={() => onAdd(item, selectedSize, selectedAddons)} fullWidth size="lg">
            {t(lang, "addToCart")}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// Checkout Modal
interface CheckoutModalProps {
  isOpen: boolean;
  cart: CartItem[];
  restaurantId: string;
  lang: Language;
  onClose: () => void;
  onSuccess: () => void;
  getItemName: (item: MenuItem, lang: Language) => string;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, cart, restaurantId, lang, onClose, onSuccess, getItemName }) => {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderType, setOrderType] = useState<"table" | "takeaway">("table");
  const [tableNumber, setTableNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const subtotal = cart.reduce((sum, item) => sum + item.itemTotal * item.quantity, 0);
  const tax = subtotal * 0.07;
  const total = subtotal + tax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!customerName.trim()) { setError(t(lang, "enterName")); return; }
    if (!isValidPhone(customerPhone)) { setError(t(lang, "enterPhone")); return; }
    if (orderType === "table" && !tableNumber.trim()) { setError(t(lang, "enterTable")); return; }

    setLoading(true);

    const orderData = {
      restaurant_id: restaurantId,
      order_type: (orderType === "table" ? "qr" : "counter") as "qr" | "counter",
      table_number: orderType === "table" ? tableNumber : undefined,
      customer_name: customerName,
      customer_phone: customerPhone,
      items: cart.map((item) => ({
        menu_item_id: item.id,
        name: item.name,
        quantity: item.quantity,
        base_price: item.base_price,
        selected_size: item.selectedSize,
        selected_addons: item.selectedAddons,
        item_total: item.itemTotal,
      })),
      subtotal,
      tax,
      total,
      customer_notes: notes,
    };

    const { error: orderError } = await createOrder(orderData);
    setLoading(false);

    if (!orderError) {
      setSuccess(true);
      setTimeout(() => { onSuccess(); resetForm(); }, 2000);
    } else {
      setError(orderError?.message || "Failed to place order");
    }
  };

  const resetForm = () => {
    setCustomerName(""); setCustomerPhone(""); setTableNumber("");
    setNotes(""); setOrderType("table"); setSuccess(false);
  };

  if (success) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title={t(lang, "orderPlaced")} size="md">
        <div className="text-center py-8">
          <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-text mb-2">{t(lang, "orderSuccess")}</h3>
          <p className="text-text-secondary mb-6">{t(lang, "orderSuccessDesc")}</p>
          <Button onClick={onClose} fullWidth>{t(lang, "close")}</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t(lang, "checkout")} size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <Alert type="error" message={error} />}

        <div>
          <label className="label mb-3">{t(lang, "orderType")}</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setOrderType("table")}
              className={`p-4 rounded-lg border-2 font-semibold transition-colors ${
                orderType === "table" ? "border-accent bg-accent/10 text-accent" : "border-border hover:border-accent/50"
              }`}
            >
              {t(lang, "dineIn")}
            </button>
            <button
              type="button"
              onClick={() => setOrderType("takeaway")}
              className={`p-4 rounded-lg border-2 font-semibold transition-colors ${
                orderType === "takeaway" ? "border-accent bg-accent/10 text-accent" : "border-border hover:border-accent/50"
              }`}
            >
              {t(lang, "takeaway")}
            </button>
          </div>
        </div>

        {orderType === "table" && (
          <Input
            label={t(lang, "tableNumber")}
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            placeholder={t(lang, "tableNumberPlaceholder")}
            required
          />
        )}

        <Input
          label={t(lang, "yourName")}
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder={t(lang, "yourNamePlaceholder")}
          required
        />

        <Input
          label={t(lang, "phoneNumber")}
          type="tel"
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
          placeholder={t(lang, "phonePlaceholder")}
          required
          helperText={t(lang, "phoneHelper")}
        />

        <div>
          <label className="label mb-2">{t(lang, "specialInstructions")}</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t(lang, "specialInstructionsPlaceholder")}
            rows={3}
            className="input-field"
          />
        </div>

        <div className="bg-bg-subtle rounded-lg p-4 space-y-2">
          <h4 className="font-semibold text-text mb-3">{t(lang, "orderSummary")}</h4>
          {cart.map((item, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span className="text-text-secondary">
                {item.quantity}x {getItemName(item, lang)}
                {item.selectedSize && ` (${item.selectedSize.name})`}
              </span>
              <span className="text-text">{formatCurrency(item.itemTotal * item.quantity)}</span>
            </div>
          ))}
          <div className="border-t border-border pt-2 mt-2 space-y-1">
            <div className="flex justify-between text-text-secondary">
              <span>{t(lang, "subtotal")}</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-text-secondary">
              <span>{t(lang, "tax")}</span>
              <span>{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold text-text pt-2 border-t border-border">
              <span>{t(lang, "total")}</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onClose} fullWidth>{t(lang, "cancel")}</Button>
          <Button type="submit" loading={loading} fullWidth>{t(lang, "placeOrder")}</Button>
        </div>
      </form>
    </Modal>
  );
};

export default CustomerMenu;
