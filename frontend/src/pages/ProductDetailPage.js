import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Star, Heart, ShoppingCart, Minus, Plus, Truck, Shield, 
  RotateCcw, Share2, Check, ChevronLeft, ChevronRight 
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useTheme } from '../context/ThemeContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Separator } from '../components/ui/separator';
import { Textarea } from '../components/ui/textarea';
import ProductCard from '../components/ProductCard';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { addToCart, loading: cartLoading, openCart } = useCart();
  const { isAuthenticated } = useAuth();
  const { t, language } = useLanguage();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [inWishlist, setInWishlist] = useState(false);
  
  // Review form
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/products/${id}`);
      setProduct(response.data);
    } catch (error) {
      console.error('Error fetching product:', error);
      toast.error('Produit non trouvé');
      navigate('/shop');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    const success = await addToCart(product.id, quantity);
    if (success) {
      openCart();
    }
  };

  const handleBuyNow = async () => {
    const success = await addToCart(product.id, quantity);
    if (success) {
      navigate('/checkout');
    }
  };

  const handleWishlist = async () => {
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
      setInWishlist(response.data.action === 'added');
      toast.success(response.data.action === 'added' ? 'Ajouté aux favoris' : 'Retiré des favoris');
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const submitReview = async () => {
    if (!isAuthenticated) {
      toast.error('Veuillez vous connecter');
      return;
    }

    if (!reviewComment.trim()) {
      toast.error('Veuillez écrire un commentaire');
      return;
    }

    setSubmittingReview(true);
    try {
      await axios.post(
        `${API_URL}/api/reviews`,
        { product_id: product.id, rating: reviewRating, comment: reviewComment },
        { withCredentials: true }
      );
      toast.success('Avis publié');
      setReviewComment('');
      fetchProduct();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la publication');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-[#1A1A2E]' : 'bg-[#F8FAFC]'} flex items-center justify-center`}>
        <div className="animate-spin w-12 h-12 border-4 border-[#0066FF] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!product) return null;

  const displayName = language === 'en' && product.name_en ? product.name_en : product.name;
  const displayDesc = language === 'en' && product.description_en ? product.description_en : product.description;
  const discount = product.compare_price 
    ? Math.round((1 - product.price / product.compare_price) * 100)
    : 0;

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#1A1A2E]' : 'bg-[#F8FAFC]'}`} data-testid="product-detail-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm mb-8">
          <button onClick={() => navigate('/shop')} className={`${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
            {t('shop')}
          </button>
          <span className={isDark ? 'text-gray-600' : 'text-gray-400'}>/</span>
          <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>{product.category}</span>
          <span className={isDark ? 'text-gray-600' : 'text-gray-400'}>/</span>
          <span className={isDark ? 'text-white' : 'text-gray-900'}>{displayName}</span>
        </nav>

        {/* Product Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Images */}
          <div className="space-y-4">
            <motion.div 
              className={`aspect-square rounded-2xl overflow-hidden ${isDark ? 'bg-[#252542]' : 'bg-white'}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <img
                src={product.images?.[selectedImage] || 'https://via.placeholder.com/600'}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            </motion.div>
            
            {product.images?.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all ${
                      selectedImage === idx 
                        ? 'border-[#0066FF]' 
                        : isDark ? 'border-white/10' : 'border-gray-200'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            {/* Badges */}
            <div className="flex items-center gap-2 mb-4">
              {discount > 0 && (
                <Badge className="bg-[#FF3B30] text-white">-{discount}%</Badge>
              )}
              {product.is_new && (
                <Badge className="bg-[#00C853] text-white">Nouveau</Badge>
              )}
              {product.stock > 0 ? (
                <Badge variant="outline" className="border-[#00C853] text-[#00C853]">
                  <Check className="w-3 h-3 mr-1" /> {t('inStock')}
                </Badge>
              ) : (
                <Badge variant="outline" className="border-[#FF3B30] text-[#FF3B30]">
                  {t('outOfStock')}
                </Badge>
              )}
            </div>

            <p className="text-[#0066FF] font-medium uppercase tracking-wider text-sm mb-2">
              {product.brand}
            </p>
            
            <h1 className={`text-3xl sm:text-4xl font-bold mb-4 ${isDark ? 'text-white' : 'text-[#1A1A2E]'}`}>
              {displayName}
            </h1>

            {/* Rating */}
            <div className="flex items-center gap-2 mb-6">
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${
                      star <= (product.avg_rating || 0)
                        ? 'fill-[#FFB300] text-[#FFB300]'
                        : isDark ? 'text-gray-600' : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                ({product.review_count || 0} {t('reviews')})
              </span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-4 mb-6">
              <span className="text-4xl font-bold text-[#0066FF]">
                ${product.price?.toFixed(2)}
              </span>
              {product.compare_price && (
                <span className={`text-xl line-through ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  ${product.compare_price?.toFixed(2)}
                </span>
              )}
            </div>

            {/* Description */}
            <p className={`mb-8 leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              {displayDesc}
            </p>

            {/* Quantity & Add to Cart */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-8">
              <div className={`flex items-center gap-3 px-4 py-2 rounded-full ${isDark ? 'bg-[#252542]' : 'bg-gray-100'}`}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  data-testid="decrease-quantity"
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className={`w-12 text-center font-semibold ${isDark ? 'text-white' : ''}`}>
                  {quantity}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  disabled={quantity >= product.stock}
                  data-testid="increase-quantity"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <Button
                onClick={handleAddToCart}
                disabled={cartLoading || product.stock === 0}
                className="flex-1 rounded-full bg-[#0066FF] hover:bg-[#3385FF] btn-glow h-12"
                data-testid="add-to-cart-btn"
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                {t('addToCart')}
              </Button>

              <Button
                variant="outline"
                size="icon"
                className={`rounded-full h-12 w-12 ${inWishlist ? 'text-red-500 border-red-500' : ''}`}
                onClick={handleWishlist}
                data-testid="wishlist-btn"
              >
                <Heart className={`w-5 h-5 ${inWishlist ? 'fill-current' : ''}`} />
              </Button>
            </div>

            {/* Buy Now */}
            <Button
              onClick={handleBuyNow}
              disabled={cartLoading || product.stock === 0}
              variant="outline"
              className={`w-full rounded-full h-12 mb-8 ${
                isDark ? 'border-white/20 hover:bg-white/10' : 'border-[#0066FF] text-[#0066FF] hover:bg-[#0066FF]/10'
              }`}
              data-testid="buy-now-btn"
            >
              {t('buyNow')}
            </Button>

            {/* Features */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: Truck, label: 'Livraison rapide' },
                { icon: Shield, label: 'Garantie 1 an' },
                { icon: RotateCcw, label: 'Retours 30 jours' },
              ].map((feature, idx) => (
                <div key={idx} className={`text-center p-4 rounded-xl ${isDark ? 'bg-[#252542]' : 'bg-gray-50'}`}>
                  <feature.icon className="w-6 h-6 mx-auto mb-2 text-[#0066FF]" />
                  <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{feature.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="mt-16">
          <Tabs defaultValue="specifications" className="w-full">
            <TabsList className={`w-full justify-start ${isDark ? 'bg-[#252542]' : 'bg-gray-100'}`}>
              <TabsTrigger value="specifications">{t('specifications')}</TabsTrigger>
              <TabsTrigger value="reviews">{t('reviews')} ({product.review_count || 0})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="specifications" className="mt-6">
              <div className={`rounded-2xl p-6 ${isDark ? 'bg-[#252542]' : 'bg-white'}`}>
                {Object.entries(product.specifications || {}).length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(product.specifications).map(([key, value]) => (
                      <div key={key} className={`flex justify-between py-3 border-b ${isDark ? 'border-white/10' : 'border-gray-100'}`}>
                        <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>{key}</span>
                        <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Aucune spécification disponible</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="reviews" className="mt-6">
              <div className={`rounded-2xl p-6 ${isDark ? 'bg-[#252542]' : 'bg-white'}`}>
                {/* Write Review */}
                {isAuthenticated && (
                  <div className="mb-8 pb-8 border-b border-gray-200 dark:border-white/10">
                    <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : ''}`}>Écrire un avis</h3>
                    <div className="flex items-center gap-2 mb-4">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setReviewRating(star)}
                          className="focus:outline-none"
                        >
                          <Star
                            className={`w-6 h-6 transition-colors ${
                              star <= reviewRating
                                ? 'fill-[#FFB300] text-[#FFB300]'
                                : isDark ? 'text-gray-600' : 'text-gray-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <Textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Partagez votre expérience..."
                      className={`mb-4 ${isDark ? 'bg-[#1A1A2E] border-white/10' : ''}`}
                    />
                    <Button
                      onClick={submitReview}
                      disabled={submittingReview}
                      className="rounded-full bg-[#0066FF] hover:bg-[#3385FF]"
                    >
                      {submittingReview ? 'Publication...' : 'Publier'}
                    </Button>
                  </div>
                )}

                {/* Reviews List */}
                {product.reviews?.length > 0 ? (
                  <div className="space-y-6">
                    {product.reviews.map((review) => (
                      <div key={review.id} className={`pb-6 border-b ${isDark ? 'border-white/10' : 'border-gray-100'} last:border-0`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#0066FF] flex items-center justify-center text-white font-medium">
                              {review.user_name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className={`font-medium ${isDark ? 'text-white' : ''}`}>{review.user_name}</p>
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`w-4 h-4 ${
                                      star <= review.rating
                                        ? 'fill-[#FFB300] text-[#FFB300]'
                                        : isDark ? 'text-gray-600' : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                          {review.verified_purchase && (
                            <Badge variant="outline" className="text-[#00C853] border-[#00C853]">
                              <Check className="w-3 h-3 mr-1" /> Achat vérifié
                            </Badge>
                          )}
                        </div>
                        <p className={`mt-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{review.comment}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Aucun avis pour le moment</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Similar Products */}
        {product.similar_products?.length > 0 && (
          <div className="mt-16">
            <h2 className={`text-2xl font-bold mb-8 ${isDark ? 'text-white' : 'text-[#1A1A2E]'}`}>
              {t('similarProducts')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {product.similar_products.map((p, idx) => (
                <ProductCard key={p.id} product={p} index={idx} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetailPage;
