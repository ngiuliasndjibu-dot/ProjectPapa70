import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Truck, Shield, Headphones, Star, ChevronRight } from 'lucide-react';
import axios from 'axios';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import ProductCard from '../components/ProductCard';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const HomePage = () => {
  const { isDark } = useTheme();
  const { t, language } = useLanguage();
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [newProducts, setNewProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [featuredRes, newRes, catRes] = await Promise.all([
          axios.get(`${API_URL}/api/products?featured=true&limit=4`),
          axios.get(`${API_URL}/api/products?is_new=true&limit=4`),
          axios.get(`${API_URL}/api/categories`)
        ]);
        setFeaturedProducts(featuredRes.data.products || []);
        setNewProducts(newRes.data.products || []);
        setCategories(catRes.data || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const features = [
    { icon: Truck, title: 'Livraison Rapide', desc: 'Partout en RDC' },
    { icon: Shield, title: 'Paiement Sécurisé', desc: 'SSL & Mobile Money' },
    { icon: Headphones, title: 'Support 24/7', desc: 'Assistance continue' },
  ];

  const testimonials = [
    { name: 'Jean M.', location: 'Kinshasa', text: 'Service excellent! Ma commande est arrivée en 2 jours.', rating: 5 },
    { name: 'Marie K.', location: 'Lubumbashi', text: 'Les meilleurs prix pour les gadgets tech en RDC!', rating: 5 },
    { name: 'Paul N.', location: 'Goma', text: 'Paiement Mobile Money très pratique. Je recommande!', rating: 4 },
  ];

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#1A1A2E]' : 'bg-[#F8FAFC]'}`} data-testid="home-page">
      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex items-center overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: `url(https://static.prod-images.emergentagent.com/jobs/9a9a2cca-e16e-40be-aff7-9376c775c950/images/0417b951452942f68488e27db0f2f0a055bb7ceab54e7079dc29d98737a9601e.png)` 
          }}
        />
        {/* Gradient Overlay */}
        <div className={`absolute inset-0 ${
          isDark 
            ? 'bg-gradient-to-r from-[#1A1A2E]/95 via-[#1A1A2E]/70 to-transparent' 
            : 'bg-gradient-to-r from-white/95 via-white/70 to-transparent'
        }`} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-2xl"
          >
            <span className="uppercase text-xs tracking-[0.2em] font-bold text-[#0066FF] mb-4 block">
              Nouvelle Collection 2025
            </span>
            <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tighter mb-6 ${
              isDark ? 'text-white' : 'text-[#1A1A2E]'
            }`}>
              {t('heroTitle')}
            </h1>
            <p className={`text-lg sm:text-xl mb-8 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              {t('heroSubtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/shop">
                <Button 
                  size="lg" 
                  className="rounded-full bg-[#0066FF] hover:bg-[#3385FF] btn-glow px-8 h-14 text-lg"
                  data-testid="hero-shop-btn"
                >
                  {t('shopNow')}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to="/categories">
                <Button 
                  variant="outline" 
                  size="lg" 
                  className={`rounded-full px-8 h-14 text-lg ${
                    isDark 
                      ? 'border-white/20 text-white hover:bg-white/10' 
                      : 'border-[#0066FF] text-[#0066FF] hover:bg-[#0066FF]/10'
                  }`}
                >
                  {t('categories')}
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Bar */}
      <section className={`py-8 ${isDark ? 'bg-[#252542]' : 'bg-white'} border-y ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
                className="flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-[#0066FF]/10 flex items-center justify-center">
                  <feature.icon className="w-6 h-6 text-[#0066FF]" />
                </div>
                <div>
                  <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{feature.title}</h3>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <span className="uppercase text-xs tracking-[0.2em] font-bold text-[#0066FF]">Explorer</span>
              <h2 className={`text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight mt-2 ${isDark ? 'text-white' : 'text-[#1A1A2E]'}`}>
                {t('categories')}
              </h2>
            </div>
            <Link to="/categories">
              <Button variant="ghost" className="text-[#0066FF]">
                Voir tout <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.slice(0, 6).map((cat, idx) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
              >
                <Link to={`/shop?category=${cat.slug}`}>
                  <div className={`group relative aspect-square rounded-2xl overflow-hidden card-hover ${
                    isDark ? 'bg-[#252542]' : 'bg-white shadow-sm'
                  }`}>
                    <img
                      src={cat.image || 'https://via.placeholder.com/200'}
                      alt={language === 'en' && cat.name_en ? cat.name_en : cat.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-white font-semibold">
                        {language === 'en' && cat.name_en ? cat.name_en : cat.name}
                      </h3>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className={`py-24 ${isDark ? 'bg-[#252542]/50' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <span className="uppercase text-xs tracking-[0.2em] font-bold text-[#0066FF]">Sélection</span>
              <h2 className={`text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight mt-2 ${isDark ? 'text-white' : 'text-[#1A1A2E]'}`}>
                Produits Populaires
              </h2>
            </div>
            <Link to="/shop?featured=true">
              <Button variant="ghost" className="text-[#0066FF]">
                Voir tout <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`aspect-[3/4] rounded-2xl animate-pulse ${isDark ? 'bg-[#252542]' : 'bg-gray-200'}`} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product, idx) => (
                <ProductCard key={product.id} product={product} index={idx} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* New Arrivals */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <span className="uppercase text-xs tracking-[0.2em] font-bold text-[#00C853]">Nouveau</span>
              <h2 className={`text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight mt-2 ${isDark ? 'text-white' : 'text-[#1A1A2E]'}`}>
                Nouveautés
              </h2>
            </div>
            <Link to="/shop?is_new=true">
              <Button variant="ghost" className="text-[#0066FF]">
                Voir tout <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>

          {!loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {newProducts.map((product, idx) => (
                <ProductCard key={product.id} product={product} index={idx} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Testimonials */}
      <section className={`py-24 ${isDark ? 'bg-[#252542]/50' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="uppercase text-xs tracking-[0.2em] font-bold text-[#0066FF]">Témoignages</span>
            <h2 className={`text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight mt-2 ${isDark ? 'text-white' : 'text-[#1A1A2E]'}`}>
              Ce que disent nos clients
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
                className={`p-6 rounded-2xl ${isDark ? 'bg-[#252542]' : 'bg-white shadow-sm'}`}
              >
                <div className="flex items-center gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${
                        star <= testimonial.rating
                          ? 'fill-[#FFB300] text-[#FFB300]'
                          : isDark ? 'text-gray-600' : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <p className={`mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  "{testimonial.text}"
                </p>
                <div>
                  <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{testimonial.name}</p>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{testimonial.location}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`rounded-3xl overflow-hidden relative ${isDark ? 'bg-[#252542]' : 'bg-[#0066FF]'}`}>
            <div className="absolute inset-0 bg-gradient-to-r from-[#0066FF] to-[#3385FF] opacity-90" />
            <div className="relative py-16 px-8 md:px-16 text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Prêt à découvrir la tech du futur?
              </h2>
              <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto">
                Rejoignez des milliers de clients satisfaits en RDC. Livraison rapide, paiement sécurisé.
              </p>
              <Link to="/shop">
                <Button size="lg" className="rounded-full bg-white text-[#0066FF] hover:bg-gray-100 px-8 h-14 text-lg font-semibold">
                  Explorer la boutique
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
