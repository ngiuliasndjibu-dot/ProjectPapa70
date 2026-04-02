import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Package, MapPin, Heart, Settings, LogOut, ChevronRight, 
  Clock, Truck, CheckCircle, XCircle, Plus
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const { isDark } = useTheme();
  const { t, language } = useLanguage();

  const [orders, setOrders] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingAddress, setAddingAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: '',
    full_name: '',
    phone: '',
    address_line1: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'RDC'
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchData();
  }, [isAuthenticated]);

  const fetchData = async () => {
    try {
      const [ordersRes, wishlistRes] = await Promise.all([
        axios.get(`${API_URL}/api/orders`, { withCredentials: true }),
        axios.get(`${API_URL}/api/user/wishlist`, { withCredentials: true })
      ]);
      setOrders(ordersRes.data || []);
      setWishlist(wishlistRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = async () => {
    try {
      await axios.post(`${API_URL}/api/user/addresses`, newAddress, { withCredentials: true });
      toast.success('Adresse ajoutée');
      setAddingAddress(false);
      setNewAddress({
        label: '',
        full_name: '',
        phone: '',
        address_line1: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'RDC'
      });
    } catch (error) {
      toast.error('Erreur lors de l\'ajout');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-500',
      confirmed: 'bg-blue-500',
      processing: 'bg-purple-500',
      shipped: 'bg-indigo-500',
      delivered: 'bg-green-500',
      cancelled: 'bg-red-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: Clock,
      confirmed: CheckCircle,
      processing: Package,
      shipped: Truck,
      delivered: CheckCircle,
      cancelled: XCircle
    };
    const Icon = icons[status] || Clock;
    return <Icon className="w-4 h-4" />;
  };

  if (!isAuthenticated) return null;

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#1A1A2E]' : 'bg-[#F8FAFC]'}`} data-testid="dashboard-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-[#1A1A2E]'}`}>
              Bonjour, {user?.name} !
            </h1>
            <p className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {user?.email || user?.phone}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className={`rounded-full ${isDark ? 'border-white/20 hover:bg-white/10' : ''}`}
            data-testid="logout-btn"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {t('logout')}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Commandes', value: orders.length, icon: Package, color: 'text-[#0066FF]' },
            { label: 'En cours', value: orders.filter(o => !['delivered', 'cancelled'].includes(o.order_status)).length, icon: Truck, color: 'text-yellow-500' },
            { label: 'Livrées', value: orders.filter(o => o.order_status === 'delivered').length, icon: CheckCircle, color: 'text-green-500' },
            { label: 'Favoris', value: wishlist.length, icon: Heart, color: 'text-red-500' }
          ].map((stat, idx) => (
            <Card key={idx} className={isDark ? 'bg-[#252542] border-white/10' : ''}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`p-3 rounded-xl ${isDark ? 'bg-[#1A1A2E]' : 'bg-gray-100'}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${isDark ? 'text-white' : ''}`}>{stat.value}</p>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList className={isDark ? 'bg-[#252542]' : ''}>
            <TabsTrigger value="orders">{t('orders')}</TabsTrigger>
            <TabsTrigger value="wishlist">{t('wishlist')}</TabsTrigger>
            <TabsTrigger value="addresses">Adresses</TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className={`h-32 rounded-2xl animate-pulse ${isDark ? 'bg-[#252542]' : 'bg-gray-200'}`} />
                ))}
              </div>
            ) : orders.length === 0 ? (
              <Card className={isDark ? 'bg-[#252542] border-white/10' : ''}>
                <CardContent className="py-16 text-center">
                  <Package className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                  <p className={`text-lg mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Aucune commande
                  </p>
                  <Link to="/shop">
                    <Button className="rounded-full bg-[#0066FF]">
                      {t('shopNow')}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {orders.map((order, idx) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Card className={`${isDark ? 'bg-[#252542] border-white/10' : ''} hover:shadow-lg transition-shadow`}>
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className="flex -space-x-3">
                              {order.items?.slice(0, 3).map((item, i) => (
                                <img
                                  key={i}
                                  src={item.product_image || 'https://via.placeholder.com/50'}
                                  alt=""
                                  className="w-12 h-12 rounded-lg object-cover border-2 border-white dark:border-[#252542]"
                                />
                              ))}
                              {order.items?.length > 3 && (
                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-sm font-medium ${isDark ? 'bg-[#1A1A2E]' : 'bg-gray-100'}`}>
                                  +{order.items.length - 3}
                                </div>
                              )}
                            </div>
                            <div>
                              <p className={`font-semibold ${isDark ? 'text-white' : ''}`}>
                                {order.order_number}
                              </p>
                              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                {new Date(order.created_at).toLocaleDateString('fr-FR')}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <Badge className={`${getStatusColor(order.order_status)} text-white flex items-center gap-1`}>
                              {getStatusIcon(order.order_status)}
                              {t(order.order_status)}
                            </Badge>
                            <p className={`font-bold text-lg ${isDark ? 'text-white' : ''}`}>
                              ${order.total?.toFixed(2)}
                            </p>
                            <Link to={`/orders/${order.id}`}>
                              <Button variant="ghost" size="icon" className="rounded-full">
                                <ChevronRight className="w-5 h-5" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Wishlist Tab */}
          <TabsContent value="wishlist">
            {wishlist.length === 0 ? (
              <Card className={isDark ? 'bg-[#252542] border-white/10' : ''}>
                <CardContent className="py-16 text-center">
                  <Heart className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                  <p className={`text-lg mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Aucun favori
                  </p>
                  <Link to="/shop">
                    <Button className="rounded-full bg-[#0066FF]">
                      Découvrir les produits
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {wishlist.map((product, idx) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Link to={`/product/${product.id}`}>
                      <Card className={`overflow-hidden ${isDark ? 'bg-[#252542] border-white/10' : ''}`}>
                        <img
                          src={product.images?.[0] || 'https://via.placeholder.com/300'}
                          alt={product.name}
                          className="w-full h-48 object-cover"
                        />
                        <CardContent className="p-4">
                          <p className={`font-semibold ${isDark ? 'text-white' : ''}`}>{product.name}</p>
                          <p className="text-[#0066FF] font-bold">${product.price?.toFixed(2)}</p>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Addresses Tab */}
          <TabsContent value="addresses">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {user?.addresses?.map((addr, idx) => (
                <Card key={idx} className={isDark ? 'bg-[#252542] border-white/10' : ''}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-[#0066FF] mt-1" />
                        <div>
                          <p className={`font-semibold ${isDark ? 'text-white' : ''}`}>{addr.label}</p>
                          <p className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {addr.full_name}<br />
                            {addr.address_line1}<br />
                            {addr.city}, {addr.country}<br />
                            {addr.phone}
                          </p>
                        </div>
                      </div>
                      {addr.is_default && (
                        <Badge className="bg-[#0066FF]">Par défaut</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Add Address */}
              <Dialog open={addingAddress} onOpenChange={setAddingAddress}>
                <DialogTrigger asChild>
                  <Card className={`cursor-pointer border-dashed ${isDark ? 'bg-[#252542]/50 border-white/20 hover:bg-[#252542]' : 'hover:bg-gray-50'}`}>
                    <CardContent className="p-6 flex items-center justify-center min-h-[200px]">
                      <div className="text-center">
                        <Plus className={`w-8 h-8 mx-auto mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                        <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Ajouter une adresse</p>
                      </div>
                    </CardContent>
                  </Card>
                </DialogTrigger>
                <DialogContent className={isDark ? 'bg-[#252542] border-white/10' : ''}>
                  <DialogHeader>
                    <DialogTitle className={isDark ? 'text-white' : ''}>Nouvelle adresse</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label className={isDark ? 'text-gray-300' : ''}>Label</Label>
                      <Input
                        value={newAddress.label}
                        onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                        placeholder="Ex: Maison, Bureau"
                        className={isDark ? 'bg-[#1A1A2E] border-white/10' : ''}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className={isDark ? 'text-gray-300' : ''}>Nom complet</Label>
                        <Input
                          value={newAddress.full_name}
                          onChange={(e) => setNewAddress({ ...newAddress, full_name: e.target.value })}
                          className={isDark ? 'bg-[#1A1A2E] border-white/10' : ''}
                        />
                      </div>
                      <div>
                        <Label className={isDark ? 'text-gray-300' : ''}>Téléphone</Label>
                        <Input
                          value={newAddress.phone}
                          onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                          className={isDark ? 'bg-[#1A1A2E] border-white/10' : ''}
                        />
                      </div>
                    </div>
                    <div>
                      <Label className={isDark ? 'text-gray-300' : ''}>Adresse</Label>
                      <Input
                        value={newAddress.address_line1}
                        onChange={(e) => setNewAddress({ ...newAddress, address_line1: e.target.value })}
                        className={isDark ? 'bg-[#1A1A2E] border-white/10' : ''}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className={isDark ? 'text-gray-300' : ''}>Ville</Label>
                        <Input
                          value={newAddress.city}
                          onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                          className={isDark ? 'bg-[#1A1A2E] border-white/10' : ''}
                        />
                      </div>
                      <div>
                        <Label className={isDark ? 'text-gray-300' : ''}>Province</Label>
                        <Input
                          value={newAddress.state}
                          onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                          className={isDark ? 'bg-[#1A1A2E] border-white/10' : ''}
                        />
                      </div>
                    </div>
                    <Button onClick={handleAddAddress} className="w-full rounded-full bg-[#0066FF]">
                      Ajouter
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DashboardPage;
