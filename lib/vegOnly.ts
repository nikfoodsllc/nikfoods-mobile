import { useSyncExternalStore } from 'react';

/** The "Veg only" choice, shared by every menu screen and remembered on the phone. */
const KEY = 'vegOnly';
const listeners = new Set<() => void>();
let value: boolean | null = null;

const read = (): boolean => {
  if (value === null) value = localStorage.getItem(KEY) === '1';
  return value;
};

export function setVegOnly(v: boolean): void {
  value = v;
  localStorage.setItem(KEY, v ? '1' : '0');
  listeners.forEach((l) => l());
}

export function useVegOnly(): [boolean, (v: boolean) => void] {
  const v = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    read
  );
  return [v, setVegOnly];
}
