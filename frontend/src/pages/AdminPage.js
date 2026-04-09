import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, Package, ShoppingCart, Users, Tag, FolderOpen,
  Plus, Edit, Trash2, Search, Eye, Upload, X, Image, Loader2
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// ===================== IMAGE UPLOADER COMPONENT =====================
const ImageUploader = ({ images, setImages, isDark }) => {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    const newImages = [...images];

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name}: trop volumineux (max 5MB)`);
        continue;
      }

      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await axios.post(`${API_URL}/api/upload`, formData, {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        newImages.push(`${API_URL}${res.data.url}`);
      } catch (err) {
        toast.error(`Erreur upload: ${file.name}`);
      }
    }

    setImages(newImages);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const addUrlImage = () => {
    const url = prompt('Entrez l\'URL de l\'image:');
    if (url && url.startsWith('http')) {
      setImages([...images, url]);
    }
  };

  return (
    <div className="space-y-3">
      <Label className={isDark ? 'text-gray-300' : ''}>Images du produit</Label>
      
      {/* Image previews */}
      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {images.map((img, idx) => (
            <div key={idx} className="relative group">
              <img
                src={img}
                alt={`Product ${idx + 1}`}
                className="w-full h-24 object-cover rounded-lg border border-white/10"
                onError={(e) => { e.target.src = 'https://via.placeholder.com/100?text=Error'; }}
              />
              <button
                onClick={() => removeImage(idx)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                data-testid={`remove-image-${idx}`}
              >
                <X className="w-3 h-3" />
              </button>
              {idx === 0 && (
                <span className="absolute bottom-1 left-1 text-[10px] bg-[#0066FF] text-white px-1.5 py-0.5 rounded">
                  Principal
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload buttons */}
      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={`flex-1 ${isDark ? 'border-white/10' : ''}`}
          data-testid="upload-images-btn"
        >
          {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
          {uploading ? 'Upload...' : 'Uploader des photos'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={addUrlImage}
          className={isDark ? 'border-white/10' : ''}
          data-testid="add-url-image-btn"
        >
          <Image className="w-4 h-4 mr-2" />
          URL
        </Button>
      </div>
      <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        JPG, PNG, WebP, GIF - Max 5MB par image. La premiere image sera l'image principale.
      </p>
    </div>
  );
};

// ===================== MAIN ADMIN PAGE =====================
export const AdminPage = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { isDark } = useTheme();
  const { t } = useLanguage();

  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [promoCodes, setPromoCodes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Product form
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productImages, setProductImages] = useState([]);
  const [productForm, setProductForm] = useState({
    name: '', name_en: '', description: '', description_en: '',
    price: '', compare_price: '', category: '', brand: '',
    specifications: '', stock: '', is_featured: false, is_new: false
  });

  // Category form
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '', name_en: '', slug: '', image: '', description: ''
  });

  // Promo form
  const [promoDialogOpen, setPromoDialogOpen] = useState(false);
  const [promoForm, setPromoForm] = useState({
    code: '', discount_type: 'percentage', discount_value: '', min_order: '0', max_uses: '100'
  });

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    fetchAll();
  }, [isAdmin]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [statsRes, ordersRes, productsRes, usersRes, promosRes, catsRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/stats`, { withCredentials: true }),
        axios.get(`${API_URL}/api/admin/orders`, { withCredentials: true }),
        axios.get(`${API_URL}/api/products?limit=100`),
        axios.get(`${API_URL}/api/admin/users`, { withCredentials: true }),
        axios.get(`${API_URL}/api/admin/promo-codes`, { withCredentials: true }),
        axios.get(`${API_URL}/api/categories`)
      ]);
      setStats(statsRes.data);
      setOrders(ordersRes.data.orders || []);
      setProducts(productsRes.data.products || []);
      setUsers(usersRes.data.users || []);
      setPromoCodes(promosRes.data || []);
      setCategories(catsRes.data || []);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ===================== ORDER HANDLERS =====================
  const handleUpdateOrderStatus = async (orderId, status) => {
    try {
      await axios.put(`${API_URL}/api/admin/orders/${orderId}/status?status=${status}`, {}, { withCredentials: true });
      toast.success('Statut mis a jour');
      fetchAll();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  // ===================== PRODUCT HANDLERS =====================
  const handleSaveProduct = async () => {
    try {
      const data = {
        ...productForm,
        price: parseFloat(productForm.price),
        compare_price: productForm.compare_price ? parseFloat(productForm.compare_price) : null,
        stock: parseInt(productForm.stock),
        images: productImages,
        specifications: productForm.specifications ? 
          Object.fromEntries(productForm.specifications.split('\n').filter(s => s.includes(':')).map(s => s.split(':').map(x => x.trim()))) : {}
      };

      if (editingProduct) {
        await axios.put(`${API_URL}/api/admin/products/${editingProduct.id}`, data, { withCredentials: true });
        toast.success('Produit mis a jour');
      } else {
        await axios.post(`${API_URL}/api/admin/products`, data, { withCredentials: true });
        toast.success('Produit cree');
      }
      
      setProductDialogOpen(false);
      setEditingProduct(null);
      resetProductForm();
      fetchAll();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Supprimer ce produit?')) return;
    try {
      await axios.delete(`${API_URL}/api/admin/products/${productId}`, { withCredentials: true });
      toast.success('Produit supprime');
      fetchAll();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const resetProductForm = () => {
    setProductForm({
      name: '', name_en: '', description: '', description_en: '',
      price: '', compare_price: '', category: '', brand: '',
      specifications: '', stock: '', is_featured: false, is_new: false
    });
    setProductImages([]);
  };

  const editProduct = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      name_en: product.name_en || '',
      description: product.description,
      description_en: product.description_en || '',
      price: product.price.toString(),
      compare_price: product.compare_price?.toString() || '',
      category: product.category,
      brand: product.brand,
      specifications: Object.entries(product.specifications || {}).map(([k, v]) => `${k}: ${v}`).join('\n'),
      stock: product.stock.toString(),
      is_featured: product.is_featured,
      is_new: product.is_new
    });
    setProductImages(product.images || []);
    setProductDialogOpen(true);
  };

  // ===================== CATEGORY HANDLERS =====================
  const handleSaveCategory = async () => {
    try {
      if (editingCategory) {
        await axios.put(`${API_URL}/api/admin/categories/${editingCategory.id}`, categoryForm, { withCredentials: true });
        toast.success('Categorie mise a jour');
      } else {
        await axios.post(`${API_URL}/api/admin/categories`, categoryForm, { withCredentials: true });
        toast.success('Categorie creee');
      }
      setCategoryDialogOpen(false);
      setEditingCategory(null);
      resetCategoryForm();
      fetchAll();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('Supprimer cette categorie?')) return;
    try {
      await axios.delete(`${API_URL}/api/admin/categories/${categoryId}`, { withCredentials: true });
      toast.success('Categorie supprimee');
      fetchAll();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  };

  const editCategory = (cat) => {
    setEditingCategory(cat);
    setCategoryForm({
      name: cat.name,
      name_en: cat.name_en || '',
      slug: cat.slug,
      image: cat.image || '',
      description: cat.description || ''
    });
    setCategoryDialogOpen(true);
  };

  const resetCategoryForm = () => {
    setCategoryForm({ name: '', name_en: '', slug: '', image: '', description: '' });
  };

  // ===================== PROMO HANDLERS =====================
  const handleCreatePromo = async () => {
    try {
      await axios.post(`${API_URL}/api/admin/promo-codes`, {
        ...promoForm,
        discount_value: parseFloat(promoForm.discount_value),
        min_order: parseFloat(promoForm.min_order),
        max_uses: parseInt(promoForm.max_uses)
      }, { withCredentials: true });
      toast.success('Code promo cree');
      setPromoDialogOpen(false);
      setPromoForm({ code: '', discount_type: 'percentage', discount_value: '', min_order: '0', max_uses: '100' });
      fetchAll();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-500', confirmed: 'bg-blue-500', processing: 'bg-purple-500',
      shipped: 'bg-indigo-500', delivered: 'bg-green-500', cancelled: 'bg-red-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  const pieColors = ['#0066FF', '#00C853', '#FFB300', '#FF3B30', '#9C27B0', '#607D8B'];

  if (!isAdmin) return null;

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#1A1A2E]' : 'bg-[#F8FAFC]'}`} data-testid="admin-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-[#1A1A2E]'}`}>
            Administration
          </h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className={`mb-8 flex-wrap ${isDark ? 'bg-[#252542]' : ''}`}>
            <TabsTrigger value="dashboard"><LayoutDashboard className="w-4 h-4 mr-2" />Dashboard</TabsTrigger>
            <TabsTrigger value="orders"><ShoppingCart className="w-4 h-4 mr-2" />Commandes</TabsTrigger>
            <TabsTrigger value="products"><Package className="w-4 h-4 mr-2" />Produits</TabsTrigger>
            <TabsTrigger value="categories" data-testid="categories-tab"><FolderOpen className="w-4 h-4 mr-2" />Categories</TabsTrigger>
            <TabsTrigger value="users"><Users className="w-4 h-4 mr-2" />Utilisateurs</TabsTrigger>
            <TabsTrigger value="promos"><Tag className="w-4 h-4 mr-2" />Promos</TabsTrigger>
          </TabsList>

          {/* ===================== DASHBOARD TAB ===================== */}
          <TabsContent value="dashboard">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className={`h-32 rounded-2xl animate-pulse ${isDark ? 'bg-[#252542]' : 'bg-gray-200'}`} />
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  {[
                    { label: 'Commandes', value: stats?.total_orders, color: 'text-[#0066FF]' },
                    { label: 'Revenus', value: `$${stats?.total_revenue?.toFixed(2)}`, color: 'text-[#00C853]' },
                    { label: 'Produits', value: stats?.total_products, color: 'text-[#FFB300]' },
                    { label: 'Utilisateurs', value: stats?.total_users, color: 'text-[#9C27B0]' }
                  ].map((stat, idx) => (
                    <Card key={idx} className={isDark ? 'bg-[#252542] border-white/10' : ''}>
                      <CardContent className="p-6">
                        <p className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{stat.label}</p>
                        <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                  <Card className={isDark ? 'bg-[#252542] border-white/10' : ''}>
                    <CardHeader><CardTitle className={isDark ? 'text-white' : ''}>Commandes par statut</CardTitle></CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={Object.entries(stats?.orders_by_status || {}).map(([name, value]) => ({ name, value }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ${value}`}>
                              {Object.entries(stats?.orders_by_status || {}).map((_, idx) => (<Cell key={idx} fill={pieColors[idx % pieColors.length]} />))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={isDark ? 'bg-[#252542] border-white/10' : ''}>
                    <CardHeader><CardTitle className={isDark ? 'text-white' : ''}>Produits les plus vendus</CardTitle></CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={stats?.top_products || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#333' : '#eee'} />
                            <XAxis dataKey="name" tick={{ fill: isDark ? '#888' : '#666' }} />
                            <YAxis tick={{ fill: isDark ? '#888' : '#666' }} />
                            <Tooltip contentStyle={{ background: isDark ? '#252542' : '#fff' }} />
                            <Bar dataKey="sold_count" fill="#0066FF" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className={isDark ? 'bg-[#252542] border-white/10' : ''}>
                  <CardHeader><CardTitle className={isDark ? 'text-white' : ''}>Commandes recentes</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className={isDark ? 'text-gray-400' : ''}>Numero</TableHead>
                          <TableHead className={isDark ? 'text-gray-400' : ''}>Client</TableHead>
                          <TableHead className={isDark ? 'text-gray-400' : ''}>Total</TableHead>
                          <TableHead className={isDark ? 'text-gray-400' : ''}>Statut</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stats?.recent_orders?.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className={isDark ? 'text-white' : ''}>{order.order_number}</TableCell>
                            <TableCell className={isDark ? 'text-gray-400' : ''}>{order.user_email || order.user_phone}</TableCell>
                            <TableCell className={isDark ? 'text-white' : ''}>${order.total?.toFixed(2)}</TableCell>
                            <TableCell><Badge className={`${getStatusColor(order.order_status)} text-white`}>{order.order_status}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* ===================== ORDERS TAB ===================== */}
          <TabsContent value="orders">
            <Card className={isDark ? 'bg-[#252542] border-white/10' : ''}>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={isDark ? 'text-gray-400' : ''}>Commande</TableHead>
                      <TableHead className={isDark ? 'text-gray-400' : ''}>Client</TableHead>
                      <TableHead className={isDark ? 'text-gray-400' : ''}>Articles</TableHead>
                      <TableHead className={isDark ? 'text-gray-400' : ''}>Total</TableHead>
                      <TableHead className={isDark ? 'text-gray-400' : ''}>Statut</TableHead>
                      <TableHead className={isDark ? 'text-gray-400' : ''}>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className={isDark ? 'text-white' : ''}>
                          <div>
                            <p className="font-medium">{order.order_number}</p>
                            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{new Date(order.created_at).toLocaleDateString('fr-FR')}</p>
                          </div>
                        </TableCell>
                        <TableCell className={isDark ? 'text-gray-400' : ''}>{order.user_email || order.user_phone}</TableCell>
                        <TableCell className={isDark ? 'text-gray-400' : ''}>{order.items?.length} articles</TableCell>
                        <TableCell className={`font-bold ${isDark ? 'text-white' : ''}`}>${order.total?.toFixed(2)}</TableCell>
                        <TableCell>
                          <Select value={order.order_status} onValueChange={(status) => handleUpdateOrderStatus(order.id, status)}>
                            <SelectTrigger className={`w-[140px] ${isDark ? 'bg-[#1A1A2E] border-white/10' : ''}`}><SelectValue /></SelectTrigger>
                            <SelectContent className={isDark ? 'bg-[#252542] border-white/10' : ''}>
                              {['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell><Button variant="ghost" size="icon"><Eye className="w-4 h-4" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===================== PRODUCTS TAB ===================== */}
          <TabsContent value="products">
            <div className="flex justify-between items-center mb-6">
              <Input placeholder="Rechercher..." className={`w-64 ${isDark ? 'bg-[#252542] border-white/10' : ''}`} />
              <Dialog open={productDialogOpen} onOpenChange={(open) => { setProductDialogOpen(open); if (!open) { setEditingProduct(null); resetProductForm(); } }}>
                <DialogTrigger asChild>
                  <Button className="rounded-full bg-[#0066FF]" data-testid="add-product-btn">
                    <Plus className="w-4 h-4 mr-2" />Ajouter un produit
                  </Button>
                </DialogTrigger>
                <DialogContent className={`max-w-2xl max-h-[90vh] overflow-y-auto ${isDark ? 'bg-[#252542] border-white/10' : ''}`}>
                  <DialogHeader>
                    <DialogTitle className={isDark ? 'text-white' : ''}>{editingProduct ? 'Modifier le produit' : 'Nouveau produit'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className={isDark ? 'text-gray-300' : ''}>Nom (FR) *</Label>
                        <Input value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} className={isDark ? 'bg-[#1A1A2E] border-white/10' : ''} />
                      </div>
                      <div>
                        <Label className={isDark ? 'text-gray-300' : ''}>Nom (EN)</Label>
                        <Input value={productForm.name_en} onChange={(e) => setProductForm({ ...productForm, name_en: e.target.value })} className={isDark ? 'bg-[#1A1A2E] border-white/10' : ''} />
                      </div>
                    </div>
                    <div>
                      <Label className={isDark ? 'text-gray-300' : ''}>Description (FR) *</Label>
                      <Textarea value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} className={isDark ? 'bg-[#1A1A2E] border-white/10' : ''} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className={isDark ? 'text-gray-300' : ''}>Prix *</Label>
                        <Input type="number" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} className={isDark ? 'bg-[#1A1A2E] border-white/10' : ''} />
                      </div>
                      <div>
                        <Label className={isDark ? 'text-gray-300' : ''}>Prix compare</Label>
                        <Input type="number" value={productForm.compare_price} onChange={(e) => setProductForm({ ...productForm, compare_price: e.target.value })} className={isDark ? 'bg-[#1A1A2E] border-white/10' : ''} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className={isDark ? 'text-gray-300' : ''}>Categorie *</Label>
                        <Select value={productForm.category} onValueChange={(v) => setProductForm({ ...productForm, category: v })}>
                          <SelectTrigger className={isDark ? 'bg-[#1A1A2E] border-white/10' : ''}><SelectValue placeholder="Selectionner" /></SelectTrigger>
                          <SelectContent className={isDark ? 'bg-[#252542] border-white/10' : ''}>
                            {categories.map((c) => (<SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className={isDark ? 'text-gray-300' : ''}>Marque *</Label>
                        <Input value={productForm.brand} onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })} className={isDark ? 'bg-[#1A1A2E] border-white/10' : ''} />
                      </div>
                    </div>
                    <div>
                      <Label className={isDark ? 'text-gray-300' : ''}>Stock *</Label>
                      <Input type="number" value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })} className={isDark ? 'bg-[#1A1A2E] border-white/10' : ''} />
                    </div>

                    {/* Image Uploader */}
                    <ImageUploader images={productImages} setImages={setProductImages} isDark={isDark} />

                    <div>
                      <Label className={isDark ? 'text-gray-300' : ''}>Specifications (Cle: Valeur, une par ligne)</Label>
                      <Textarea value={productForm.specifications} onChange={(e) => setProductForm({ ...productForm, specifications: e.target.value })} placeholder="Ecran: 6.7 pouces&#10;RAM: 8GB" className={isDark ? 'bg-[#1A1A2E] border-white/10' : ''} />
                    </div>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={productForm.is_featured} onChange={(e) => setProductForm({ ...productForm, is_featured: e.target.checked })} className="rounded" />
                        <span className={isDark ? 'text-gray-300' : ''}>Mis en avant</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={productForm.is_new} onChange={(e) => setProductForm({ ...productForm, is_new: e.target.checked })} className="rounded" />
                        <span className={isDark ? 'text-gray-300' : ''}>Nouveau</span>
                      </label>
                    </div>
                    <Button onClick={handleSaveProduct} className="w-full rounded-full bg-[#0066FF]" data-testid="save-product-btn">
                      {editingProduct ? 'Mettre a jour' : 'Creer le produit'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card className={isDark ? 'bg-[#252542] border-white/10' : ''}>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={isDark ? 'text-gray-400' : ''}>Produit</TableHead>
                      <TableHead className={isDark ? 'text-gray-400' : ''}>Categorie</TableHead>
                      <TableHead className={isDark ? 'text-gray-400' : ''}>Prix</TableHead>
                      <TableHead className={isDark ? 'text-gray-400' : ''}>Stock</TableHead>
                      <TableHead className={isDark ? 'text-gray-400' : ''}>Vendus</TableHead>
                      <TableHead className={isDark ? 'text-gray-400' : ''}>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <img src={product.images?.[0] || 'https://via.placeholder.com/40'} alt="" className="w-10 h-10 rounded-lg object-cover" />
                            <div>
                              <p className={`font-medium ${isDark ? 'text-white' : ''}`}>{product.name}</p>
                              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{product.brand}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className={isDark ? 'text-gray-400' : ''}>{product.category}</TableCell>
                        <TableCell className={`font-bold ${isDark ? 'text-white' : ''}`}>${product.price}</TableCell>
                        <TableCell><Badge className={product.stock > 10 ? 'bg-green-500' : product.stock > 0 ? 'bg-yellow-500' : 'bg-red-500'}>{product.stock}</Badge></TableCell>
                        <TableCell className={isDark ? 'text-gray-400' : ''}>{product.sold_count || 0}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon" onClick={() => editProduct(product)} data-testid={`edit-product-${product.id}`}><Edit className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteProduct(product.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===================== CATEGORIES TAB ===================== */}
          <TabsContent value="categories">
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : ''}`}>{categories.length} categories</h2>
              <Dialog open={categoryDialogOpen} onOpenChange={(open) => { setCategoryDialogOpen(open); if (!open) { setEditingCategory(null); resetCategoryForm(); } }}>
                <DialogTrigger asChild>
                  <Button className="rounded-full bg-[#0066FF]" data-testid="add-category-btn">
                    <Plus className="w-4 h-4 mr-2" />Ajouter une categorie
                  </Button>
                </DialogTrigger>
                <DialogContent className={isDark ? 'bg-[#252542] border-white/10' : ''}>
                  <DialogHeader>
                    <DialogTitle className={isDark ? 'text-white' : ''}>{editingCategory ? 'Modifier la categorie' : 'Nouvelle categorie'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className={isDark ? 'text-gray-300' : ''}>Nom (FR) *</Label>
                        <Input value={categoryForm.name} onChange={(e) => {
                          const name = e.target.value;
                          const slug = !editingCategory ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : categoryForm.slug;
                          setCategoryForm({ ...categoryForm, name, slug });
                        }} className={isDark ? 'bg-[#1A1A2E] border-white/10' : ''} data-testid="category-name" />
                      </div>
                      <div>
                        <Label className={isDark ? 'text-gray-300' : ''}>Nom (EN)</Label>
                        <Input value={categoryForm.name_en} onChange={(e) => setCategoryForm({ ...categoryForm, name_en: e.target.value })} className={isDark ? 'bg-[#1A1A2E] border-white/10' : ''} />
                      </div>
                    </div>
                    <div>
                      <Label className={isDark ? 'text-gray-300' : ''}>Slug *</Label>
                      <Input value={categoryForm.slug} onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })} placeholder="ex: smartphones" className={isDark ? 'bg-[#1A1A2E] border-white/10' : ''} data-testid="category-slug" />
                      <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Identifiant unique (minuscules, sans espaces)</p>
                    </div>
                    <div>
                      <Label className={isDark ? 'text-gray-300' : ''}>Image URL</Label>
                      <Input value={categoryForm.image} onChange={(e) => setCategoryForm({ ...categoryForm, image: e.target.value })} placeholder="https://..." className={isDark ? 'bg-[#1A1A2E] border-white/10' : ''} />
                      {categoryForm.image && (
                        <img src={categoryForm.image} alt="Preview" className="w-20 h-20 mt-2 rounded-lg object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                      )}
                    </div>
                    <div>
                      <Label className={isDark ? 'text-gray-300' : ''}>Description</Label>
                      <Textarea value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} className={isDark ? 'bg-[#1A1A2E] border-white/10' : ''} />
                    </div>
                    <Button onClick={handleSaveCategory} className="w-full rounded-full bg-[#0066FF]" data-testid="save-category-btn">
                      {editingCategory ? 'Mettre a jour' : 'Creer la categorie'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((cat) => (
                <Card key={cat.id} className={`overflow-hidden ${isDark ? 'bg-[#252542] border-white/10' : ''}`}>
                  {cat.image && (
                    <img src={cat.image} alt={cat.name} className="w-full h-36 object-cover" />
                  )}
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className={`font-semibold ${isDark ? 'text-white' : ''}`}>{cat.name}</h3>
                        {cat.name_en && <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{cat.name_en}</p>}
                        <p className={`text-xs mt-1 font-mono ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{cat.slug}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => editCategory(cat)} data-testid={`edit-category-${cat.id}`}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(cat.id)} className="text-red-500" data-testid={`delete-category-${cat.id}`}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ===================== USERS TAB ===================== */}
          <TabsContent value="users">
            <Card className={isDark ? 'bg-[#252542] border-white/10' : ''}>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={isDark ? 'text-gray-400' : ''}>Utilisateur</TableHead>
                      <TableHead className={isDark ? 'text-gray-400' : ''}>Contact</TableHead>
                      <TableHead className={isDark ? 'text-gray-400' : ''}>Role</TableHead>
                      <TableHead className={isDark ? 'text-gray-400' : ''}>Date d'inscription</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id || u.email}>
                        <TableCell className={isDark ? 'text-white' : ''}>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#0066FF] flex items-center justify-center text-white font-medium">
                              {u.name?.charAt(0).toUpperCase()}
                            </div>
                            <span>{u.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className={isDark ? 'text-gray-400' : ''}>{u.email || u.phone}</TableCell>
                        <TableCell><Badge className={u.role === 'admin' ? 'bg-purple-500' : 'bg-gray-500'}>{u.role}</Badge></TableCell>
                        <TableCell className={isDark ? 'text-gray-400' : ''}>{new Date(u.created_at).toLocaleDateString('fr-FR')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===================== PROMOS TAB ===================== */}
          <TabsContent value="promos">
            <div className="flex justify-end mb-6">
              <Dialog open={promoDialogOpen} onOpenChange={setPromoDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="rounded-full bg-[#0066FF]"><Plus className="w-4 h-4 mr-2" />Creer un code promo</Button>
                </DialogTrigger>
                <DialogContent className={isDark ? 'bg-[#252542] border-white/10' : ''}>
                  <DialogHeader><DialogTitle className={isDark ? 'text-white' : ''}>Nouveau code promo</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label className={isDark ? 'text-gray-300' : ''}>Code *</Label>
                      <Input value={promoForm.code} onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })} placeholder="TECH20" className={isDark ? 'bg-[#1A1A2E] border-white/10' : ''} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className={isDark ? 'text-gray-300' : ''}>Type</Label>
                        <Select value={promoForm.discount_type} onValueChange={(v) => setPromoForm({ ...promoForm, discount_type: v })}>
                          <SelectTrigger className={isDark ? 'bg-[#1A1A2E] border-white/10' : ''}><SelectValue /></SelectTrigger>
                          <SelectContent className={isDark ? 'bg-[#252542] border-white/10' : ''}>
                            <SelectItem value="percentage">Pourcentage</SelectItem>
                            <SelectItem value="fixed">Montant fixe</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className={isDark ? 'text-gray-300' : ''}>Valeur *</Label>
                        <Input type="number" value={promoForm.discount_value} onChange={(e) => setPromoForm({ ...promoForm, discount_value: e.target.value })} className={isDark ? 'bg-[#1A1A2E] border-white/10' : ''} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className={isDark ? 'text-gray-300' : ''}>Min commande</Label>
                        <Input type="number" value={promoForm.min_order} onChange={(e) => setPromoForm({ ...promoForm, min_order: e.target.value })} className={isDark ? 'bg-[#1A1A2E] border-white/10' : ''} />
                      </div>
                      <div>
                        <Label className={isDark ? 'text-gray-300' : ''}>Max utilisations</Label>
                        <Input type="number" value={promoForm.max_uses} onChange={(e) => setPromoForm({ ...promoForm, max_uses: e.target.value })} className={isDark ? 'bg-[#1A1A2E] border-white/10' : ''} />
                      </div>
                    </div>
                    <Button onClick={handleCreatePromo} className="w-full rounded-full bg-[#0066FF]">Creer</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card className={isDark ? 'bg-[#252542] border-white/10' : ''}>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={isDark ? 'text-gray-400' : ''}>Code</TableHead>
                      <TableHead className={isDark ? 'text-gray-400' : ''}>Reduction</TableHead>
                      <TableHead className={isDark ? 'text-gray-400' : ''}>Min commande</TableHead>
                      <TableHead className={isDark ? 'text-gray-400' : ''}>Utilisations</TableHead>
                      <TableHead className={isDark ? 'text-gray-400' : ''}>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {promoCodes.map((promo) => (
                      <TableRow key={promo.id}>
                        <TableCell className={`font-mono font-bold ${isDark ? 'text-white' : ''}`}>{promo.code}</TableCell>
                        <TableCell className={isDark ? 'text-gray-400' : ''}>{promo.discount_type === 'percentage' ? `${promo.discount_value}%` : `$${promo.discount_value}`}</TableCell>
                        <TableCell className={isDark ? 'text-gray-400' : ''}>${promo.min_order}</TableCell>
                        <TableCell className={isDark ? 'text-gray-400' : ''}>{promo.uses || 0} / {promo.max_uses}</TableCell>
                        <TableCell><Badge className={promo.is_active ? 'bg-green-500' : 'bg-red-500'}>{promo.is_active ? 'Actif' : 'Inactif'}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPage;
