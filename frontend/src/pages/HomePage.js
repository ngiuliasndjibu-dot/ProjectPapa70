import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowRight, ChevronLeft, ChevronRight, Truck, Shield, Headphones, 
  Clock, Zap, Star, Gift, Percent, TrendingUp, Sparkles, Timer
} from 'lucide-react';
import axios from 'axios';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Countdown Timer Component
const CountdownTimer = ({ endTime }) => {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(endTime).getTime();
      const diff = end - now;

      if (diff > 0) {
        setTimeLeft({
          hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((diff % (1000 * 60)) / 1000)
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [endTime]);

  return (
    <div className="flex items-center gap-1">
      {[
        { value: timeLeft.hours, label: 'h' },
        { value: timeLeft.minutes, label: 'm' },
        { value: timeLeft.seconds, label: 's' }
      ].map((item, idx) => (
        <React.Fragment key={idx}>
          <div className="bg-[#FF3B30] text-white px-2 py-1 rounded font-bold text-sm min-w-[32px] text-center">
            {String(item.value).padStart(2, '0')}
          </div>
          {idx < 2 && <span className="text-[#FF3B30] font-bold">:</span>}
        </React.Fragment>
      ))}
    </div>
  );
};

// Mini Product Card for deals
const MiniProductCard = ({ product, isDark }) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const discount = product.compare_price 
    ? Math.round((1 - product.price / product.compare_price) * 100)
    : 0;

  return (
    <div 
      onClick={() => navigate(`/product/${product.id}`)}
      className={`cursor-pointer group rounded-xl overflow-hidden transition-all hover:shadow-lg ${
        isDark ? 'bg-[#252542] hover:bg-[#2a2a4a]' : 'bg-white hover:shadow-xl'
      }`}
    >
      <div className="relative aspect-square overflow-hidden">
        <img 
          src={product.images?.[0] || 'https://via.placeholder.com/200'} 
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {discount > 0 && (
          <Badge className="absolute top-2 left-2 bg-[#FF3B30] text-white text-xs">
            -{discount}%
          </Badge>
        )}
        {product.is_new && (
          <Badge className="absolute top-2 right-2 bg-[#00C853] text-white text-xs">
            NEW
          </Badge>
        )}
      </div>
      <div className="p-3">
        <p className={`text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {product.brand}
        </p>
        <h3 className={`font-medium text-sm line-clamp-2 mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {product.name}
        </h3>
        <div className="flex items-center gap-1 mt-1">
          {[1,2,3,4,5].map(s => (
            <Star key={s} className={`w-3 h-3 ${s <= (product.avg_rating || 4) ? 'fill-[#FFB300] text-[#FFB300]' : 'text-gray-300'}`} />
          ))}
          <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>({product.review_count || 0})</span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-lg font-bold text-[#FF3B30]">${product.price}</span>
          {product.compare_price && (
            <span className={`text-xs line-through ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              ${product.compare_price}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// Horizontal Scroll Product Section
const ProductCarousel = ({ title, icon: Icon, products, isDark, linkTo, accentColor = '#0066FF' }) => {
  const scrollRef = useRef(null);
  
  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className={`rounded-2xl p-4 ${isDark ? 'bg-[#1e1e36]' : 'bg-white shadow-sm'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-5 h-5" style={{ color: accentColor }} />}
          <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => scroll('left')} className="rounded-full h-8 w-8">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => scroll('right')} className="rounded-full h-8 w-8">
            <ChevronRight className="w-4 h-4" />
          </Button>
          {linkTo && (
            <Link to={linkTo}>
              <Button variant="ghost" size="sm" className="text-[#0066FF]">
                Voir tout <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          )}
        </div>
      </div>
      <div 
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {products.map((product, idx) => (
          <div key={product.id} className="flex-shrink-0 w-[180px]">
            <MiniProductCard product={product} isDark={isDark} />
          </div>
        ))}
      </div>
    </div>
  );
};

export const HomePage = () => {
  const { isDark } = useTheme();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [allProducts, setAllProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentBanner, setCurrentBanner] = useState(0);

  const banners = [
    {
      title: "FLASH SALE",
      subtitle: "Jusqu'à -50% sur les smartphones",
      bg: "from-[#FF3B30] to-[#FF6B5B]",
      image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800"
    },
    {
      title: "NOUVEAUTÉS",
      subtitle: "Découvrez les derniers gadgets tech",
      bg: "from-[#0066FF] to-[#3385FF]",
      image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800"
    },
    {
      title: "LIVRAISON GRATUITE",
      subtitle: "Pour toute commande > $100",
      bg: "from-[#00C853] to-[#69F0AE]",
      image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"
    }
  ];

  useEffect(() => {
    fetchData();
    const bannerInterval = setInterval(() => {
      setCurrentBanner(prev => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(bannerInterval);
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, catRes] = await Promise.all([
        axios.get(`${API_URL}/api/products?limit=50`),
        axios.get(`${API_URL}/api/categories`)
      ]);
      setAllProducts(productsRes.data.products || []);
      setCategories(catRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const featuredProducts = allProducts.filter(p => p.is_featured);
  const newProducts = allProducts.filter(p => p.is_new);
  const dealsProducts = allProducts.filter(p => p.compare_price && p.compare_price > p.price);
  const topRated = [...allProducts].sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0)).slice(0, 10);

  // Deal of the day - pick first deal product
  const dealOfDay = dealsProducts[0];
  const flashSaleEnd = new Date();
  flashSaleEnd.setHours(flashSaleEnd.getHours() + 8);

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#1A1A2E]' : 'bg-[#F0F2F5]'}`} data-testid="home-page">
      
      {/* Top Promo Bar */}
      <div className="bg-gradient-to-r from-[#FF3B30] to-[#FF6B5B] text-white py-2 px-4 text-center text-sm font-medium">
        <span className="flex items-center justify-center gap-2">
          <Zap className="w-4 h-4" />
          VENTE FLASH! Utilisez le code <span className="font-bold bg-white/20 px-2 py-0.5 rounded">WELCOME10</span> pour -10% sur votre 1ère commande
          <Zap className="w-4 h-4" />
        </span>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        
        {/* Main Hero Section - Amazon Style Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
          
          {/* Main Banner Carousel */}
          <div className="lg:col-span-3 relative rounded-2xl overflow-hidden h-[300px] lg:h-[400px]">
            {banners.map((banner, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0 }}
                animate={{ opacity: currentBanner === idx ? 1 : 0 }}
                transition={{ duration: 0.5 }}
                className={`absolute inset-0 bg-gradient-to-r ${banner.bg} flex items-center`}
                style={{ zIndex: currentBanner === idx ? 1 : 0 }}
              >
                <div className="flex-1 p-8 lg:p-12">
                  <Badge className="bg-white/20 text-white mb-4">{banner.title}</Badge>
                  <h1 className="text-3xl lg:text-5xl font-bold text-white mb-4">{banner.subtitle}</h1>
                  <Button 
                    onClick={() => navigate('/shop')}
                    className="bg-white text-gray-900 hover:bg-gray-100 rounded-full px-8"
                  >
                    Acheter maintenant <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
                <div className="hidden lg:block w-1/3 h-full relative">
                  <img src={banner.image} alt="" className="absolute right-0 bottom-0 h-full object-contain" />
                </div>
              </motion.div>
            ))}
            
            {/* Banner Dots */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              {banners.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentBanner(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    currentBanner === idx ? 'bg-white w-6' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Side Promos */}
          <div className="hidden lg:flex flex-col gap-4">
            <div 
              onClick={() => navigate('/shop?category=smartphones')}
              className="flex-1 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-800 p-4 cursor-pointer hover:scale-[1.02] transition-transform"
            >
              <p className="text-white/80 text-sm">Smartphones</p>
              <p className="text-white font-bold text-lg mt-1">Jusqu'à -30%</p>
              <p className="text-white/80 text-xs mt-2">Voir les offres →</p>
            </div>
            <div 
              onClick={() => navigate('/shop?category=audio')}
              className="flex-1 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 p-4 cursor-pointer hover:scale-[1.02] transition-transform"
            >
              <p className="text-white/80 text-sm">Audio & Casques</p>
              <p className="text-white font-bold text-lg mt-1">Nouveautés</p>
              <p className="text-white/80 text-xs mt-2">Découvrir →</p>
            </div>
            <div 
              onClick={() => navigate('/shop?category=wearables')}
              className="flex-1 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 p-4 cursor-pointer hover:scale-[1.02] transition-transform"
            >
              <p className="text-white/80 text-sm">Montres</p>
              <p className="text-white font-bold text-lg mt-1">Collection 2025</p>
              <p className="text-white/80 text-xs mt-2">Explorer →</p>
            </div>
          </div>
        </div>

        {/* Categories Quick Links */}
        <div className={`rounded-2xl p-4 mb-6 ${isDark ? 'bg-[#1e1e36]' : 'bg-white shadow-sm'}`}>
          <div className="flex items-center gap-6 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            {categories.map((cat) => (
              <Link 
                key={cat.id} 
                to={`/shop?category=${cat.slug}`}
                className="flex flex-col items-center gap-2 flex-shrink-0 group"
              >
                <div className={`w-16 h-16 rounded-full overflow-hidden border-2 border-transparent group-hover:border-[#0066FF] transition-all ${
                  isDark ? 'bg-[#252542]' : 'bg-gray-100'
                }`}>
                  <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                </div>
                <span className={`text-xs font-medium text-center ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {language === 'en' && cat.name_en ? cat.name_en : cat.name}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Flash Deals Section */}
        <div className={`rounded-2xl p-4 mb-6 ${isDark ? 'bg-[#1e1e36]' : 'bg-white shadow-sm'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-[#FF3B30] p-2 rounded-lg">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Ventes Flash
                </h2>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Offres limitées dans le temps
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Se termine dans:</span>
              <CountdownTimer endTime={flashSaleEnd.toISOString()} />
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {dealsProducts.slice(0, 6).map((product) => (
              <MiniProductCard key={product.id} product={product} isDark={isDark} />
            ))}
          </div>
        </div>

        {/* Deal of the Day + Features */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          
          {/* Deal of the Day */}
          {dealOfDay && (
            <div className={`lg:col-span-2 rounded-2xl overflow-hidden ${isDark ? 'bg-[#1e1e36]' : 'bg-white shadow-sm'}`}>
              <div className="bg-gradient-to-r from-[#FF3B30] to-[#FF6B5B] p-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                  <Gift className="w-5 h-5" />
                  <span className="font-bold">OFFRE DU JOUR</span>
                </div>
                <CountdownTimer endTime={flashSaleEnd.toISOString()} />
              </div>
              <div className="p-6 flex flex-col md:flex-row gap-6">
                <div className="md:w-1/2">
                  <img 
                    src={dealOfDay.images?.[0]} 
                    alt={dealOfDay.name}
                    className="w-full h-64 object-contain"
                  />
                </div>
                <div className="md:w-1/2 flex flex-col justify-center">
                  <Badge className="w-fit bg-[#FF3B30] text-white mb-2">
                    -{Math.round((1 - dealOfDay.price / dealOfDay.compare_price) * 100)}% OFF
                  </Badge>
                  <h3 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {dealOfDay.name}
                  </h3>
                  <div className="flex items-center gap-1 mb-3">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`w-4 h-4 ${s <= (dealOfDay.avg_rating || 4) ? 'fill-[#FFB300] text-[#FFB300]' : 'text-gray-300'}`} />
                    ))}
                    <span className={`text-sm ml-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      ({dealOfDay.review_count || 0} avis)
                    </span>
                  </div>
                  <div className="flex items-baseline gap-3 mb-4">
                    <span className="text-4xl font-bold text-[#FF3B30]">${dealOfDay.price}</span>
                    <span className={`text-xl line-through ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      ${dealOfDay.compare_price}
                    </span>
                  </div>
                  <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {dealOfDay.description?.substring(0, 150)}...
                  </p>
                  <Button 
                    onClick={() => navigate(`/product/${dealOfDay.id}`)}
                    className="bg-[#FF3B30] hover:bg-[#E63429] text-white rounded-full"
                  >
                    Voir l'offre <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Features */}
          <div className="flex flex-col gap-4">
            {[
              { icon: Truck, title: 'Livraison Rapide', desc: 'Partout en RDC', color: '#0066FF' },
              { icon: Shield, title: 'Paiement Sécurisé', desc: 'SSL & Mobile Money', color: '#00C853' },
              { icon: Headphones, title: 'Support 24/7', desc: 'Assistance continue', color: '#9C27B0' },
              { icon: Percent, title: 'Meilleurs Prix', desc: 'Garantie prix bas', color: '#FF6B00' }
            ].map((feature, idx) => (
              <div 
                key={idx}
                className={`flex items-center gap-4 p-4 rounded-xl ${isDark ? 'bg-[#1e1e36]' : 'bg-white shadow-sm'}`}
              >
                <div className="p-3 rounded-xl" style={{ backgroundColor: `${feature.color}15` }}>
                  <feature.icon className="w-6 h-6" style={{ color: feature.color }} />
                </div>
                <div>
                  <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{feature.title}</h4>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* New Arrivals Carousel */}
        {!loading && newProducts.length > 0 && (
          <div className="mb-6">
            <ProductCarousel 
              title="Nouveautés" 
              icon={Sparkles}
              products={newProducts} 
              isDark={isDark}
              linkTo="/shop?is_new=true"
              accentColor="#00C853"
            />
          </div>
        )}

        {/* Top Rated Carousel */}
        {!loading && topRated.length > 0 && (
          <div className="mb-6">
            <ProductCarousel 
              title="Les Mieux Notés" 
              icon={TrendingUp}
              products={topRated} 
              isDark={isDark}
              linkTo="/shop?sort=rating"
              accentColor="#FFB300"
            />
          </div>
        )}

        {/* Category Product Grids */}
        {categories.slice(0, 3).map((category) => {
          const categoryProducts = allProducts.filter(p => p.category === category.slug).slice(0, 8);
          if (categoryProducts.length === 0) return null;
          
          return (
            <div key={category.id} className="mb-6">
              <ProductCarousel 
                title={language === 'en' && category.name_en ? category.name_en : category.name}
                products={categoryProducts} 
                isDark={isDark}
                linkTo={`/shop?category=${category.slug}`}
                accentColor="#0066FF"
              />
            </div>
          );
        })}

        {/* Bottom Promo Banners */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div 
            onClick={() => navigate('/shop?category=gaming')}
            className="relative rounded-2xl overflow-hidden h-48 cursor-pointer group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-900/90 to-purple-600/70" />
            <img 
              src="https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=800" 
              alt="Gaming"
              className="absolute inset-0 w-full h-full object-cover -z-10 group-hover:scale-105 transition-transform duration-500"
            />
            <div className="relative p-6 h-full flex flex-col justify-center">
              <Badge className="w-fit bg-white/20 text-white mb-2">Gaming</Badge>
              <h3 className="text-2xl font-bold text-white">Équipement Gamer</h3>
              <p className="text-white/80 mt-1">Consoles, manettes & accessoires</p>
              <Button variant="link" className="text-white p-0 mt-2 w-fit">
                Explorer <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
          
          <div 
            onClick={() => navigate('/shop?category=laptops')}
            className="relative rounded-2xl overflow-hidden h-48 cursor-pointer group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-900/90 to-blue-600/70" />
            <img 
              src="https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800" 
              alt="Laptops"
              className="absolute inset-0 w-full h-full object-cover -z-10 group-hover:scale-105 transition-transform duration-500"
            />
            <div className="relative p-6 h-full flex flex-col justify-center">
              <Badge className="w-fit bg-white/20 text-white mb-2">Laptops</Badge>
              <h3 className="text-2xl font-bold text-white">Ordinateurs Portables</h3>
              <p className="text-white/80 mt-1">MacBook, Dell, HP & plus</p>
              <Button variant="link" className="text-white p-0 mt-2 w-fit">
                Explorer <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>

        {/* Newsletter CTA */}
        <div className={`rounded-2xl p-8 text-center ${isDark ? 'bg-gradient-to-r from-[#252542] to-[#1e1e36]' : 'bg-gradient-to-r from-gray-100 to-gray-50'}`}>
          <h3 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Restez informé des meilleures offres !
          </h3>
          <p className={`mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Inscrivez-vous pour recevoir nos promotions exclusives
          </p>
          <div className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
            <input 
              type="email" 
              placeholder="Votre email"
              className={`flex-1 px-4 py-3 rounded-full border ${
                isDark ? 'bg-[#1A1A2E] border-white/10 text-white' : 'bg-white border-gray-200'
              }`}
            />
            <Button className="bg-[#0066FF] hover:bg-[#3385FF] rounded-full px-8">
              S'inscrire
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default HomePage;
