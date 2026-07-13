import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface CartItem {
  unitId: string;
  serialNumber: string;
  productName: string;
  category: string | null;
  price: number;
  imageUrl: string | null;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (unitId: string) => void;
  clearCart: () => void;
  count: number;
  total: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "furniture-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  // Start empty on both server and client — hydrate from localStorage after mount
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  function addItem(item: CartItem) {
    setItems((prev) => {
      if (prev.some((i) => i.unitId === item.unitId)) return prev;
      return [...prev, item];
    });
  }

  function removeItem(unitId: string) {
    setItems((prev) => prev.filter((i) => i.unitId !== unitId));
  }

  function clearCart() {
    setItems([]);
  }

  const count = items.length;
  const total = items.reduce((sum, i) => sum + i.price, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        clearCart,
        count,
        total,
        isOpen,
        openCart: () => setIsOpen(true),
        closeCart: () => setIsOpen(false),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
