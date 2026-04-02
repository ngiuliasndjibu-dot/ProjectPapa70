import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, X, Grid3X3, LayoutList } from 'lucide-react';
import axios from 'axios';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Slider } from '../components/ui/slider';
import { Checkbox } from '../components/ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet';
import { Badge } from '../components/ui/badge';
import ProductCard from '../components/ProductCard';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const ShopPage = () => {
  const { isDark } = useTheme();
  const { t, language } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [selectedBrand, setSelectedBrand] = useState(searchParams.get('brand') || '');
  const [priceRange, setPriceRange] = useState([0, 2500]);
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchBrands();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, selectedBrand, sortBy, currentPage, searchQuery]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/categories`);
      setCategories(response.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchBrands = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/products/brands/list`);
      setBrands(response.data || []);
    } catch (error) {
      console.error('Error fetching brands:', error);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedBrand) params.append('brand', selectedBrand);
      if (searchQuery) params.append('search', searchQuery);
      params.append('sort', sortBy);
      params.append('page', currentPage);
      params.append('min_price', priceRange[0]);
      params.append('max_price', priceRange[1]);

      const response = await axios.get(`${API_URL}/api/products?${params.toString()}`);
      setProducts(response.data.products || []);
      setTotalPages(response.data.pages || 1);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchProducts();
  };

  const clearFilters = () => {
    setSelectedCategory('');
    setSelectedBrand('');
    setPriceRange([0, 2500]);
    setSortBy('newest');
    setSearchQuery('');
    setCurrentPage(1);
    setSearchParams({});
  };

  const activeFiltersCount = [selectedCategory, selectedBrand, searchQuery].filter(Boolean).length;

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Categories */}
      <div>
        <h3 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {t('categories')}
        </h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox 
              checked={!selectedCategory}
              onCheckedChange={() => setSelectedCategory('')}
            />
            <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>{t('all')}</span>
          </label>
          {categories.map((cat) => (
            <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
              <Checkbox 
                checked={selectedCategory === cat.slug}
                onCheckedChange={() => setSelectedCategory(cat.slug)}
              />
              <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>
                {language === 'en' && cat.name_en ? cat.name_en : cat.name}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Brands */}
      <div>
        <h3 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Marques
        </h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox 
              checked={!selectedBrand}
              onCheckedChange={() => setSelectedBrand('')}
            />
            <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>{t('all')}</span>
          </label>
          {brands.map((brand) => (
            <label key={brand} className="flex items-center gap-2 cursor-pointer">
              <Checkbox 
                checked={selectedBrand === brand}
                onCheckedChange={() => setSelectedBrand(brand)}
              />
              <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>{brand}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h3 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {t('price')}
        </h3>
        <Slider
          value={priceRange}
          onValueChange={setPriceRange}
          max={2500}
          step={50}
          className="mb-4"
        />
        <div className="flex items-center justify-between text-sm">
          <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>${priceRange[0]}</span>
          <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>${priceRange[1]}</span>
        </div>
      </div>

      <Button 
        variant="outline" 
        onClick={clearFilters}
        className="w-full"
      >
        Réinitialiser les filtres
      </Button>
    </div>
  );

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#1A1A2E]' : 'bg-[#F8FAFC]'}`} data-testid="shop-page">
      {/* Header */}
      <div className={`py-8 ${isDark ? 'bg-[#252542]' : 'bg-white'} border-b ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-[#1A1A2E]'}`}>
                {t('shop')}
              </h1>
              <p className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {products.length} produits trouvés
              </p>
            </div>

            {/* Search & Sort */}
            <div className="flex items-center gap-4">
              <form onSubmit={handleSearch} className="relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                <Input
                  type="text"
                  placeholder={t('search') + '...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`pl-10 w-[200px] sm:w-[300px] rounded-full ${
                    isDark ? 'bg-[#1A1A2E] border-white/10' : 'bg-gray-50'
                  }`}
                  data-testid="shop-search"
                />
              </form>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className={`w-[180px] rounded-full ${isDark ? 'bg-[#1A1A2E] border-white/10' : ''}`} data-testid="sort-select">
                  <SelectValue placeholder={t('sort')} />
                </SelectTrigger>
                <SelectContent className={isDark ? 'bg-[#252542] border-white/10' : ''}>
                  <SelectItem value="newest">{t('newest')}</SelectItem>
                  <SelectItem value="price_asc">{t('priceAsc')}</SelectItem>
                  <SelectItem value="price_desc">{t('priceDesc')}</SelectItem>
                  <SelectItem value="popular">{t('popular')}</SelectItem>
                  <SelectItem value="rating">Meilleures notes</SelectItem>
                </SelectContent>
              </Select>

              {/* Mobile Filter Button */}
              <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
                <SheetTrigger asChild className="lg:hidden">
                  <Button variant="outline" size="icon" className="relative rounded-full" data-testid="filter-toggle">
                    <SlidersHorizontal className="w-4 h-4" />
                    {activeFiltersCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#0066FF] text-white text-xs rounded-full flex items-center justify-center">
                        {activeFiltersCount}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className={isDark ? 'bg-[#1A1A2E] border-white/10' : ''}>
                  <SheetHeader>
                    <SheetTitle className={isDark ? 'text-white' : ''}>{t('filter')}</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <FilterContent />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Active Filters */}
          {(selectedCategory || selectedBrand || searchQuery) && (
            <div className="flex flex-wrap items-center gap-2 mt-4">
              {selectedCategory && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {categories.find(c => c.slug === selectedCategory)?.name}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedCategory('')} />
                </Badge>
              )}
              {selectedBrand && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {selectedBrand}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedBrand('')} />
                </Badge>
              )}
              {searchQuery && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  "{searchQuery}"
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSearchQuery('')} />
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-red-500">
                Tout effacer
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          <aside className={`hidden lg:block w-64 flex-shrink-0`}>
            <div className={`sticky top-24 p-6 rounded-2xl ${isDark ? 'bg-[#252542]' : 'bg-white shadow-sm'}`}>
              <h2 className={`font-bold text-lg mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {t('filter')}
              </h2>
              <FilterContent />
            </div>
          </aside>

          {/* Products Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className={`aspect-[3/4] rounded-2xl animate-pulse ${isDark ? 'bg-[#252542]' : 'bg-gray-200'}`} />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16">
                <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Aucun produit trouvé
                </p>
                <Button onClick={clearFilters} className="mt-4">
                  Réinitialiser les filtres
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {products.map((product, idx) => (
                    <ProductCard key={product.id} product={product} index={idx} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-12">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={page === currentPage ? 'default' : 'outline'}
                        size="icon"
                        className={`rounded-full ${page === currentPage ? 'bg-[#0066FF]' : ''}`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopPage;
