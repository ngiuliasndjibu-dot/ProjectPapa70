import React, { createContext, useContext, useState, useEffect } from 'react';
import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';

// Translations
const resources = {
  fr: {
    translation: {
      // Navigation
      home: "Accueil",
      shop: "Boutique",
      categories: "Catégories",
      account: "Compte",
      cart: "Panier",
      admin: "Admin",
      
      // Auth
      login: "Connexion",
      register: "Inscription",
      logout: "Déconnexion",
      email: "Email",
      phone: "Téléphone",
      password: "Mot de passe",
      name: "Nom",
      
      // Products
      addToCart: "Ajouter au panier",
      buyNow: "Acheter maintenant",
      inStock: "En stock",
      outOfStock: "Rupture de stock",
      price: "Prix",
      reviews: "Avis",
      specifications: "Spécifications",
      similarProducts: "Produits similaires",
      
      // Cart
      yourCart: "Votre Panier",
      emptyCart: "Votre panier est vide",
      subtotal: "Sous-total",
      shipping: "Livraison",
      freeShipping: "Gratuit",
      total: "Total",
      checkout: "Commander",
      promoCode: "Code promo",
      apply: "Appliquer",
      
      // Checkout
      shippingAddress: "Adresse de livraison",
      paymentMethod: "Mode de paiement",
      placeOrder: "Passer la commande",
      orderSuccess: "Commande réussie!",
      
      // Orders
      orders: "Commandes",
      orderHistory: "Historique des commandes",
      orderNumber: "Numéro de commande",
      trackOrder: "Suivre la commande",
      orderStatus: "Statut",
      
      // Statuses
      pending: "En attente",
      confirmed: "Confirmée",
      processing: "En traitement",
      shipped: "Expédiée",
      delivered: "Livrée",
      cancelled: "Annulée",
      
      // Payment
      creditCard: "Carte bancaire",
      mobileMoney: "Mobile Money",
      cashOnDelivery: "Paiement à la livraison",
      
      // Common
      search: "Rechercher",
      filter: "Filtrer",
      sort: "Trier",
      newest: "Plus récent",
      priceAsc: "Prix croissant",
      priceDesc: "Prix décroissant",
      popular: "Populaire",
      all: "Tous",
      save: "Enregistrer",
      cancel: "Annuler",
      confirm: "Confirmer",
      loading: "Chargement...",
      error: "Erreur",
      success: "Succès",
      
      // Hero
      heroTitle: "La Tech du Futur, Aujourd'hui",
      heroSubtitle: "Découvrez notre collection exclusive de gadgets technologiques",
      shopNow: "Acheter maintenant",
      
      // Newsletter
      newsletter: "Newsletter",
      newsletterText: "Abonnez-vous pour recevoir nos offres exclusives",
      subscribe: "S'abonner",
      
      // Footer
      aboutUs: "À propos",
      contactUs: "Contactez-nous",
      faq: "FAQ",
      privacyPolicy: "Politique de confidentialité",
      termsOfService: "Conditions d'utilisation",
      
      // Wishlist
      wishlist: "Liste de souhaits",
      addToWishlist: "Ajouter aux favoris",
      removeFromWishlist: "Retirer des favoris",
      
      // Chat
      chatTitle: "Assistant Hyper-Gadgets",
      chatPlaceholder: "Posez votre question...",
      chatWelcome: "Bonjour! Comment puis-je vous aider?"
    }
  },
  en: {
    translation: {
      // Navigation
      home: "Home",
      shop: "Shop",
      categories: "Categories",
      account: "Account",
      cart: "Cart",
      admin: "Admin",
      
      // Auth
      login: "Login",
      register: "Register",
      logout: "Logout",
      email: "Email",
      phone: "Phone",
      password: "Password",
      name: "Name",
      
      // Products
      addToCart: "Add to Cart",
      buyNow: "Buy Now",
      inStock: "In Stock",
      outOfStock: "Out of Stock",
      price: "Price",
      reviews: "Reviews",
      specifications: "Specifications",
      similarProducts: "Similar Products",
      
      // Cart
      yourCart: "Your Cart",
      emptyCart: "Your cart is empty",
      subtotal: "Subtotal",
      shipping: "Shipping",
      freeShipping: "Free",
      total: "Total",
      checkout: "Checkout",
      promoCode: "Promo Code",
      apply: "Apply",
      
      // Checkout
      shippingAddress: "Shipping Address",
      paymentMethod: "Payment Method",
      placeOrder: "Place Order",
      orderSuccess: "Order Successful!",
      
      // Orders
      orders: "Orders",
      orderHistory: "Order History",
      orderNumber: "Order Number",
      trackOrder: "Track Order",
      orderStatus: "Status",
      
      // Statuses
      pending: "Pending",
      confirmed: "Confirmed",
      processing: "Processing",
      shipped: "Shipped",
      delivered: "Delivered",
      cancelled: "Cancelled",
      
      // Payment
      creditCard: "Credit Card",
      mobileMoney: "Mobile Money",
      cashOnDelivery: "Cash on Delivery",
      
      // Common
      search: "Search",
      filter: "Filter",
      sort: "Sort",
      newest: "Newest",
      priceAsc: "Price: Low to High",
      priceDesc: "Price: High to Low",
      popular: "Popular",
      all: "All",
      save: "Save",
      cancel: "Cancel",
      confirm: "Confirm",
      loading: "Loading...",
      error: "Error",
      success: "Success",
      
      // Hero
      heroTitle: "Future Tech, Today",
      heroSubtitle: "Discover our exclusive collection of tech gadgets",
      shopNow: "Shop Now",
      
      // Newsletter
      newsletter: "Newsletter",
      newsletterText: "Subscribe to receive our exclusive offers",
      subscribe: "Subscribe",
      
      // Footer
      aboutUs: "About Us",
      contactUs: "Contact Us",
      faq: "FAQ",
      privacyPolicy: "Privacy Policy",
      termsOfService: "Terms of Service",
      
      // Wishlist
      wishlist: "Wishlist",
      addToWishlist: "Add to Wishlist",
      removeFromWishlist: "Remove from Wishlist",
      
      // Chat
      chatTitle: "Hyper-Gadgets Assistant",
      chatPlaceholder: "Ask your question...",
      chatWelcome: "Hello! How can I help you?"
    }
  }
};

// Initialize i18n
i18n.use(initReactI18next).init({
  resources,
  lng: localStorage.getItem('language') || 'fr',
  fallbackLng: 'fr',
  interpolation: {
    escapeValue: false
  }
});

const LanguageContext = createContext(null);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const { t } = useTranslation();
  const [language, setLanguageState] = useState(i18n.language);

  const setLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setLanguageState(lng);
    localStorage.setItem('language', lng);
  };

  const toggleLanguage = () => {
    setLanguage(language === 'fr' ? 'en' : 'fr');
  };

  const value = {
    language,
    setLanguage,
    toggleLanguage,
    t,
    isFrench: language === 'fr'
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export { useTranslation };
