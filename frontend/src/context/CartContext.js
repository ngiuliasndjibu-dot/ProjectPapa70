import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CartContext = createContext(null);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState({ items: [], subtotal: 0, shipping: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const fetchCart = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/cart`, { withCredentials: true });
      setCart(response.data);
    } catch (error) {
      console.error('Error fetching cart:', error);
    }
  }, []);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = async (productId, quantity = 1) => {
    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/cart/add`, { product_id: productId, quantity }, { withCredentials: true });
      await fetchCart();
      toast.success('Produit ajouté au panier');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'ajout au panier');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (productId, quantity) => {
    setLoading(true);
    try {
      await axios.put(`${API_URL}/api/cart/update`, { product_id: productId, quantity }, { withCredentials: true });
      await fetchCart();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const removeItem = async (productId) => {
    setLoading(true);
    try {
      await axios.delete(`${API_URL}/api/cart/remove/${productId}`, { withCredentials: true });
      await fetchCart();
      toast.success('Produit retiré du panier');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    } finally {
      setLoading(false);
    }
  };

  const clearCart = async () => {
    setLoading(true);
    try {
      await axios.delete(`${API_URL}/api/cart/clear`, { withCredentials: true });
      await fetchCart();
    } catch (error) {
      console.error('Error clearing cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);

  const itemCount = cart.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  const value = {
    cart,
    loading,
    isOpen,
    itemCount,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    fetchCart,
    openCart,
    closeCart
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
