import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { IAddress } from '@/types/auth';

/**
 * The signed-in customer's saved addresses, with the website's rule for which one is selected:
 * the one chosen before, else the default, else the first (and the cart follows the selection).
 */
export function useAddresses() {
  const { user } = useAuth();
  const { selectedAddressId, updateAddress } = useCart();
  const [addresses, setAddresses] = useState<IAddress[]>([]);
  const [loading, setLoading] = useState(false);
  const autoSelected = useRef(false);

  const reload = useCallback(async () => {
    if (!user) {
      setAddresses([]);
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      const response = await fetch('/api/address', { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) return;
      const data = await response.json();
      if (data.success) setAddresses(Array.isArray(data.data?.items) ? data.data.items : []);
    } catch {
      // keep what we have
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) autoSelected.current = false;
    void reload();
  }, [user, reload]);

  useEffect(() => {
    if (!user || addresses.length === 0 || autoSelected.current) return;
    const storedId = localStorage.getItem('selectedAddressId') || selectedAddressId;
    const pickAddr = (storedId ? addresses.find((a) => a._id?.toString() === storedId) : undefined) || addresses.find((a) => a.isDefault === true) || addresses[0];
    const id = pickAddr?._id?.toString();
    if (!id) return;
    autoSelected.current = true;
    void updateAddress(id).catch(() => {});
  }, [user, addresses, selectedAddressId, updateAddress]);

  return { addresses, loading, reload, selectedAddressId };
}
