import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  slug: string;
  variant?: { name: string; value: string };
  stock: number;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;

  // Actions
  addItem:       (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem:    (id: string, variant?: string) => void;
  updateQuantity:(id: string, quantity: number, variant?: string) => void;
  clearCart:     () => void;
  toggleCart:    () => void;
  openCart:      () => void;
  closeCart:     () => void;

  // Computed
  itemCount:     () => number;
  subtotal:      () => number;
  total:         () => number;
}

const itemKey = (id: string, variant?: string) => `${id}:${variant || 'default'}`;

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (item) => {
        set((state) => {
          const key = itemKey(item.id, item.variant?.value);
          const existing = state.items.find(
            (i) => itemKey(i.id, i.variant?.value) === key
          );

          if (existing) {
            const newQty = Math.min(existing.quantity + (item.quantity || 1), item.stock);
            return {
              items: state.items.map((i) =>
                itemKey(i.id, i.variant?.value) === key
                  ? { ...i, quantity: newQty }
                  : i
              ),
              isOpen: true,
            };
          }

          return {
            items: [...state.items, { ...item, quantity: item.quantity || 1 }],
            isOpen: true,
          };
        });
      },

      removeItem: (id, variant) => {
        const key = itemKey(id, variant);
        set((state) => ({
          items: state.items.filter((i) => itemKey(i.id, i.variant?.value) !== key),
        }));
      },

      updateQuantity: (id, quantity, variant) => {
        const key = itemKey(id, variant);
        if (quantity <= 0) {
          get().removeItem(id, variant);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            itemKey(i.id, i.variant?.value) === key ? { ...i, quantity } : i
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),
      openCart:   () => set({ isOpen: true }),
      closeCart:  () => set({ isOpen: false }),

      itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal:  () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      total: () => {
        const sub = get().subtotal();
        const shipping = sub >= 50 ? 0 : 9.99;
        const tax = sub * 0.08;
        return Math.round((sub + shipping + tax) * 100) / 100;
      },
    }),
    {
      name: 'ecom-cart',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
