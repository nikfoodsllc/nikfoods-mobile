type CartItem = {
  id: string;
  name: string;
  price: number;
  url: string;
  veg: boolean;
  quantity: number;
  deliveryDate: string;
  deliveryDateFormatted: string;
};

let cart: CartItem[] = [];
let listeners: (() => void)[] = [];

export const cartStore = {
  getItems: () => cart,

  addItem: (item: Omit<CartItem, 'quantity'>) => {
    const existing = cart.find(
      c => c.id === item.id && c.deliveryDate === item.deliveryDate
    );
    if (existing) {
      existing.quantity += 1;
    } else {
      cart = [...cart, { ...item, quantity: 1 }];
    }
    listeners.forEach(l => l());
  },

  removeItem: (id: string, deliveryDate: string) => {
    cart = cart.filter(c => !(c.id === id && c.deliveryDate === deliveryDate));
    listeners.forEach(l => l());
  },

  updateQuantity: (id: string, deliveryDate: string, quantity: number) => {
    if (quantity <= 0) {
      cartStore.removeItem(id, deliveryDate);
      return;
    }
    cart = cart.map(c =>
      c.id === id && c.deliveryDate === deliveryDate ? { ...c, quantity } : c
    );
    listeners.forEach(l => l());
  },

  getTotal: () => cart.reduce((sum, c) => sum + c.price * c.quantity, 0),

  getCount: () => cart.reduce((sum, c) => sum + c.quantity, 0),

  subscribe: (listener: () => void) => {
    listeners.push(listener);
    return () => { listeners = listeners.filter(l => l !== listener); };
  },

  clear: () => {
    cart = [];
    listeners.forEach(l => l());
  },
};