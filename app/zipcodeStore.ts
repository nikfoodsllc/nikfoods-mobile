type ZipcodeConfig = {
  zipcode: string;
  minCartValue: number;
  deliveryFee: number;
  isServiceable: boolean;
};

let config: ZipcodeConfig | null = null;
let listeners: (() => void)[] = [];

export const zipcodeStore = {
  getConfig: () => config,

  setConfig: (c: ZipcodeConfig) => {
    config = c;
    listeners.forEach(l => l());
  },

  clear: () => {
    config = null;
    listeners.forEach(l => l());
  },

  isServiceable: () => config?.isServiceable ?? null,
  getMinOrderValue: () => config?.minCartValue ?? 0,
  getDeliveryFee: () => config?.deliveryFee ?? 0,
  getZipcode: () => config?.zipcode ?? null,

  subscribe: (listener: () => void) => {
    listeners.push(listener);
    return () => { listeners = listeners.filter(l => l !== listener); };
  },
};

export const checkZipcode = async (zipcode: string): Promise<ZipcodeConfig> => {
  const res = await fetch(
    `https://www.nikfoods.com/api/zipcode-config?zipcode=${zipcode}`
  );

  if (res.status === 404) {
    const cfg: ZipcodeConfig = {
      zipcode,
      minCartValue: 0,
      deliveryFee: 0,
      isServiceable: false,
    };
    zipcodeStore.setConfig(cfg);
    return cfg;
  }

  const data = await res.json();

  if (data.success) {
    const cfg: ZipcodeConfig = {
      zipcode,
      minCartValue: data.data.minCartValue,
      deliveryFee: data.data.deliveryFee,
      isServiceable: true,
    };
    zipcodeStore.setConfig(cfg);
    return cfg;
  }

  throw new Error(data.error || 'Failed to check zipcode');
};

export default zipcodeStore;