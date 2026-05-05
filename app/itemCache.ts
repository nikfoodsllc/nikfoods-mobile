let cachedItem: Record<string, any> = {};

export const itemCache = {
  set: (id: string, data: Record<string, any>) => {
    cachedItem[id] = data;
  },
  get: (id: string) => {
    return cachedItem[id] || null;
  },
  clear: () => {
    cachedItem = {};
  },
};
export default itemCache;