import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingCart, Heart, Star, Eye } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const ProductCard = ({ product, index = 0 }) => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { addToCart, loading } = useCart();
  const { isAuthenticated } = useAuth();
  const { language } = useLanguage();

  const handleAddToCart = async (e) => {
    e.stopPropagation();
    await addToCart(product.id, 1);
  };

  const handleWishlist = async (e) => {
    e.stopPropagation();
    
    if (!isAuthenticated) {
      toast.error('Veuillez vous connecter');
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/api/user/wishlist/${product.id}`,
        {},
        { withCredentials: true }
      );
      toast.success(response.data.action === 'added' ? 'Ajouté aux favoris' : 'Retiré des favoris');
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleViewProduct = (e) => {
    e.stopPropagation();
    navigate(`/product/${product.id}`);
  };

  const handleCardClick = () => {
    navigate(`/product/${product.id}`);
  };

  const displayName = language === 'en' && product.name_en ? product.name_en : product.name;
  const discount = product.compare_price 
    ? Math.round((1 - product.price / product.compare_price) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      data-testid={`product-card-${product.id}`}
      onClick={handleCardClick}
      className="cursor-pointer"
    >
      <div className={`group relative rounded-2xl overflow-hidden card-hover ${
        isDark 
          ? 'bg-[#252542] border border-white/5' 
          : 'bg-white border border-gray-100 shadow-sm hover:shadow-md'
      }`}>
        {/* Image Container */}
        <div className="relative aspect-square overflow-hidden">
          <img
            src={product.images?.[0] || 'https://via.placeholder.com/400'}
            alt={displayName}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
          
          {/* Overlay Actions */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
            <Button
              size="icon"
              variant="secondary"
              className="rounded-full bg-white hover:bg-[#0066FF] hover:text-white"
              onClick={handleAddToCart}
              disabled={loading || product.stock === 0}
              data-testid={`add-to-cart-${product.id}`}
            >
              <ShoppingCart className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="rounded-full bg-white hover:bg-red-500 hover:text-white"
              onClick={handleWishlist}
              data-testid={`wishlist-${product.id}`}
            >
              <Heart className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="rounded-full bg-white hover:bg-[#0066FF] hover:text-white"
              onClick={handleViewProduct}
            >
              <Eye className="w-4 h-4" />
            </Button>
          </div>

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {discount > 0 && (
              <Badge className="bg-[#FF3B30] text-white">-{discount}%</Badge>
            )}
            {product.is_new && (
              <Badge className="bg-[#00C853] text-white">Nouveau</Badge>
            )}
            {product.stock === 0 && (
              <Badge variant="secondary" className="bg-gray-800 text-white">Rupture</Badge>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${isDark ? 'text-[#0066FF]' : 'text-[#0066FF]'}`}>
            {product.brand}
          </p>
          <h3 className={`font-semibold mb-2 line-clamp-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {displayName}
          </h3>
          
          {/* Rating */}
          <div className="flex items-center gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-4 h-4 ${
                  star <= (product.avg_rating || 0)
                    ? 'fill-[#FFB300] text-[#FFB300]'
                    : isDark ? 'text-gray-600' : 'text-gray-300'
                }`}
              />
            ))}
            <span className={`text-sm ml-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              ({product.review_count || 0})
            </span>
          </div>

          {/* Price */}
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-[#0066FF]">
              ${product.price?.toFixed(2)}
            </span>
            {product.compare_price && (
              <span className={`text-sm line-through ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                ${product.compare_price?.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
