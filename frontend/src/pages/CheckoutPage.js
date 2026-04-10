import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Smartphone, Truck, MapPin, Check, ChevronRight, 
  ArrowLeft, Loader2, AlertCircle
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { useTheme } from '../context/ThemeContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Separator } from '../components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const CheckoutPage = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { cart, fetchCart, clearCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const { t } = useLanguage();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [appliedPromo, setAppliedPromo] = useState(null);

  // Address form
  const [address, setAddress] = useState({
    full_name: user?.name || '',
    phone: user?.phone || '',
    address_line1: '',
    address_line2: '',
    city: 'Kinshasa',
    state: '',
    postal_code: '',
    country: 'RDC'
  });

  // Payment
  const [paymentMethod, setPaymentMethod] = useState('paypal');
  const [mobileMoneyProvider, setMobileMoneyProvider] = useState('mpesa');
  const [mobileMoneyPhone, setMobileMoneyPhone] = useState(user?.phone || '+243');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [maskedPhone, setMaskedPhone] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/checkout');
      return;
    }
    fetchCart();
  }, [isAuthenticated]);

  // OTP countdown timer
  useEffect(() => {
    if (otpCountdown <= 0) return;
    const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [otpCountdown]);

// OTP countdown timer removed Stripe polling

  const applyPromoCode = async () => {
    if (!promoCode) return;

    try {
      const response = await axios.post(`${API_URL}/api/cart/promo?code=${promoCode}`, {}, { withCredentials: true });
      const promo = response.data;
      
      let discount = 0;
      if (promo.discount_type === 'percentage') {
        discount = cart.subtotal * (promo.discount_value / 100);
      } else {
        discount = promo.discount_value;
      }
      
      if (cart.subtotal < promo.min_order) {
        toast.error(`Minimum de commande: $${promo.min_order}`);
        return;
      }

      setPromoDiscount(discount);
      setAppliedPromo(promo);
      toast.success('Code promo appliqué!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Code invalide');
    }
  };

  const handleMobileMoneyInitiate = async () => {
    if (!mobileMoneyPhone) {
      toast.error('Veuillez entrer votre numéro');
      return;
    }

    const cleaned = mobileMoneyPhone.replace(/[\s\-]/g, '');
    if (!/^\+?243\d{9}$/.test(cleaned)) {
      toast.error('Format invalide. Utilisez +243XXXXXXXXX');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/payments/mobile-money/initiate?provider=${mobileMoneyProvider}&phone_number=${encodeURIComponent(cleaned)}`,
        {},
        { withCredentials: true }
      );
      
      setTransactionId(response.data.transaction_id);
      setMaskedPhone(response.data.phone_number || cleaned);
      setOtpSent(true);
      setOtpCountdown(60);
      toast.success('Code OTP envoyé par SMS!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'envoi du code');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (otpCountdown > 0) return;
    setLoading(true);
    try {
      await axios.post(
        `${API_URL}/api/payments/mobile-money/resend-otp?transaction_id=${transactionId}`,
        {},
        { withCredentials: true }
      );
      setOtpCountdown(60);
      setOtp('');
      toast.success('Nouveau code OTP envoyé!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors du renvoi');
    } finally {
      setLoading(false);
    }
  };

  const handleMobileMoneyVerify = async () => {
    if (!otp) {
      toast.error('Veuillez entrer le code OTP');
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${API_URL}/api/payments/mobile-money/verify?transaction_id=${transactionId}&otp=${otp}`,
        {},
        { withCredentials: true }
      );
      
      // Create order
      await createOrder('mobile_money');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Code invalide');
    } finally {
      setLoading(false);
    }
  };

  const createOrder = async (paymentMethod) => {
    setLoading(true);
    try {
      const orderData = {
        shipping_address: address,
        payment_method: paymentMethod,
        mobile_money_provider: paymentMethod === 'mobile_money' ? mobileMoneyProvider : null,
        promo_code: appliedPromo?.code || null
      };

      await axios.post(`${API_URL}/api/orders`, orderData, { withCredentials: true });
      toast.success('Commande créée avec succès!');
      await clearCart();
      navigate('/orders');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la commande');
    } finally {
      setLoading(false);
    }
  };

  const handleCODOrder = async () => {
    await createOrder('cod');
  };

  const finalTotal = cart.total - promoDiscount;

  const mobileMoneyProviders = [
    { id: 'mpesa', name: 'M-Pesa', color: 'bg-green-600' },
    { id: 'airtel', name: 'Airtel Money', color: 'bg-red-600' },
    { id: 'orange', name: 'Orange Money', color: 'bg-orange-500' },
    { id: 'africell', name: 'Africell Money', color: 'bg-yellow-500' }
  ];

  if (!isAuthenticated || cart.items?.length === 0) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-[#1A1A2E]' : 'bg-[#F8FAFC]'} flex items-center justify-center`}>
        <div className="text-center">
          <p className={`text-lg mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {cart.items?.length === 0 ? 'Votre panier est vide' : 'Veuillez vous connecter'}
          </p>
          <Button onClick={() => navigate('/shop')} className="rounded-full bg-[#0066FF]">
            Continuer vos achats
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#1A1A2E]' : 'bg-[#F8FAFC]'}`} data-testid="checkout-page">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-[#1A1A2E]'}`}>
            {t('checkout')}
          </h1>
        </div>

        {/* Steps */}
        <div className="flex items-center justify-center mb-12">
          {[1, 2, 3].map((s, idx) => (
            <React.Fragment key={s}>
              <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold ${
                step >= s 
                  ? 'bg-[#0066FF] text-white' 
                  : isDark ? 'bg-[#252542] text-gray-400' : 'bg-gray-200 text-gray-500'
              }`}>
                {step > s ? <Check className="w-5 h-5" /> : s}
              </div>
              {idx < 2 && (
                <div className={`w-24 h-1 mx-2 ${
                  step > s ? 'bg-[#0066FF]' : isDark ? 'bg-[#252542]' : 'bg-gray-200'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Shipping Address */}
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <Card className={isDark ? 'bg-[#252542] border-white/10' : ''}>
                  <CardHeader>
                    <CardTitle className={`flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
                      <MapPin className="w-5 h-5 text-[#0066FF]" />
                      {t('shippingAddress')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className={isDark ? 'text-gray-300' : ''}>Nom complet *</Label>
                        <Input
                          value={address.full_name}
                          onChange={(e) => setAddress({ ...address, full_name: e.target.value })}
                          className={isDark ? 'bg-[#1A1A2E] border-white/10' : ''}
                          data-testid="checkout-name"
                        />
                      </div>
                      <div>
                        <Label className={isDark ? 'text-gray-300' : ''}>Téléphone *</Label>
                        <Input
                          value={address.phone}
                          onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                          className={isDark ? 'bg-[#1A1A2E] border-white/10' : ''}
                          data-testid="checkout-phone"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className={isDark ? 'text-gray-300' : ''}>Adresse *</Label>
                      <Input
                        value={address.address_line1}
                        onChange={(e) => setAddress({ ...address, address_line1: e.target.value })}
                        className={isDark ? 'bg-[#1A1A2E] border-white/10' : ''}
                        data-testid="checkout-address"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className={isDark ? 'text-gray-300' : ''}>Ville *</Label>
                        <Input
                          value={address.city}
                          onChange={(e) => setAddress({ ...address, city: e.target.value })}
                          className={isDark ? 'bg-[#1A1A2E] border-white/10' : ''}
                          data-testid="checkout-city"
                        />
                      </div>
                      <div>
                        <Label className={isDark ? 'text-gray-300' : ''}>Province</Label>
                        <Input
                          value={address.state}
                          onChange={(e) => setAddress({ ...address, state: e.target.value })}
                          className={isDark ? 'bg-[#1A1A2E] border-white/10' : ''}
                        />
                      </div>
                    </div>
                    <Button
                      onClick={() => setStep(2)}
                      disabled={!address.full_name || !address.phone || !address.address_line1 || !address.city}
                      className="w-full rounded-full bg-[#0066FF] hover:bg-[#3385FF] h-12"
                      data-testid="continue-to-payment"
                    >
                      Continuer vers le paiement
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Step 2: Payment Method */}
            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <Card className={isDark ? 'bg-[#252542] border-white/10' : ''}>
                  <CardHeader>
                    <CardTitle className={`flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
                      <Smartphone className="w-5 h-5 text-[#0066FF]" />
                      {t('paymentMethod')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-4">
                      {/* PayPal */}
                      <label className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer border-2 transition-all ${
                        paymentMethod === 'paypal' 
                          ? 'border-[#0066FF] bg-[#0066FF]/10' 
                          : isDark ? 'border-white/10 hover:border-white/20' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <RadioGroupItem value="paypal" />
                        <div className="w-6 h-6 flex items-center justify-center text-blue-600 font-bold">P</div>
                        <div className="flex-1">
                          <p className={`font-medium ${isDark ? 'text-white' : ''}`}>PayPal</p>
                          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Paiement sécurisé PayPal</p>
                        </div>
                      </label>

                      {/* Mobile Money */}
                      <label className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer border-2 transition-all ${
                        paymentMethod === 'mobile_money' 
                          ? 'border-[#0066FF] bg-[#0066FF]/10' 
                          : isDark ? 'border-white/10 hover:border-white/20' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <RadioGroupItem value="mobile_money" />
                        <Smartphone className="w-6 h-6 text-[#00C853]" />
                        <div className="flex-1">
                          <p className={`font-medium ${isDark ? 'text-white' : ''}`}>{t('mobileMoney')}</p>
                          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>M-Pesa, Airtel, Orange, Africell</p>
                        </div>
                      </label>

                      {/* Cash on Delivery */}
                      <label className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer border-2 transition-all ${
                        paymentMethod === 'cod' 
                          ? 'border-[#0066FF] bg-[#0066FF]/10' 
                          : isDark ? 'border-white/10 hover:border-white/20' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <RadioGroupItem value="cod" />
                        <Truck className="w-6 h-6 text-[#FFB300]" />
                        <div className="flex-1">
                          <p className={`font-medium ${isDark ? 'text-white' : ''}`}>{t('cashOnDelivery')}</p>
                          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Payez à la livraison</p>
                        </div>
                      </label>
                    </RadioGroup>

                    {/* Mobile Money Providers */}
                    {paymentMethod === 'mobile_money' && (
                      <div className="mt-6 space-y-4">
                        <Label className={isDark ? 'text-gray-300' : ''}>Choisir l'opérateur</Label>
                        <div className="grid grid-cols-2 gap-3">
                          {mobileMoneyProviders.map((provider) => (
                            <button
                              key={provider.id}
                              onClick={() => { setMobileMoneyProvider(provider.id); setOtpSent(false); setOtp(''); }}
                              data-testid={`provider-${provider.id}`}
                              className={`p-3 rounded-xl flex items-center justify-center gap-2 border-2 transition-all ${
                                mobileMoneyProvider === provider.id 
                                  ? 'border-[#0066FF] bg-[#0066FF]/10' 
                                  : isDark ? 'border-white/10' : 'border-gray-200'
                              }`}
                            >
                              <div className={`w-4 h-4 rounded-full ${provider.color}`} />
                              <span className={isDark ? 'text-white' : ''}>{provider.name}</span>
                            </button>
                          ))}
                        </div>

                        <div>
                          <Label className={isDark ? 'text-gray-300' : ''}>Numéro de téléphone (RDC)</Label>
                          <Input
                            value={mobileMoneyPhone}
                            onChange={(e) => setMobileMoneyPhone(e.target.value)}
                            placeholder="+243XXXXXXXXX"
                            className={isDark ? 'bg-[#1A1A2E] border-white/10' : ''}
                            data-testid="mobile-money-phone"
                            disabled={otpSent}
                          />
                          <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            Format: +243 suivi de 9 chiffres
                          </p>
                        </div>

                        {otpSent && (
                          <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#1A1A2E] border-white/10' : 'bg-green-50 border-green-200'}`}>
                            <div className="flex items-center gap-2 mb-3">
                              <Check className="w-4 h-4 text-[#00C853]" />
                              <span className={`text-sm font-medium ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                                Code envoyé au {maskedPhone}
                              </span>
                            </div>
                            <Label className={isDark ? 'text-gray-300' : ''}>Code OTP (6 chiffres)</Label>
                            <Input
                              value={otp}
                              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              placeholder="______"
                              maxLength={6}
                              className={`text-center text-2xl tracking-[0.5em] font-mono ${isDark ? 'bg-[#252542] border-white/10' : ''}`}
                              data-testid="otp-input"
                            />
                            <div className="flex items-center justify-between mt-2">
                              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                Expire dans 10 minutes
                              </p>
                              <button
                                onClick={handleResendOtp}
                                disabled={otpCountdown > 0 || loading}
                                className={`text-xs font-medium ${
                                  otpCountdown > 0 
                                    ? isDark ? 'text-gray-600' : 'text-gray-400' 
                                    : 'text-[#0066FF] hover:underline cursor-pointer'
                                }`}
                                data-testid="resend-otp"
                              >
                                {otpCountdown > 0 ? `Renvoyer dans ${otpCountdown}s` : 'Renvoyer le code'}
                              </button>
                            </div>
                          </div>
                        )}

                        {!otpSent && (
                          <Button
                            onClick={handleMobileMoneyInitiate}
                            disabled={loading || !mobileMoneyPhone}
                            className="w-full rounded-full bg-[#00C853] hover:bg-[#00A843] h-12"
                            data-testid="send-otp-btn"
                          >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Smartphone className="w-5 h-5 mr-2" />}
                            Recevoir le code OTP
                          </Button>
                        )}
                      </div>
                    )}

                    <div className="flex gap-4 mt-6">
                      <Button
                        variant="outline"
                        onClick={() => setStep(1)}
                        className="flex-1 rounded-full"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Retour
                      </Button>
                      <Button
                        onClick={() => setStep(3)}
                        className="flex-1 rounded-full bg-[#0066FF] hover:bg-[#3385FF]"
                        data-testid="continue-to-confirm"
                      >
                        Continuer
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Step 3: Confirmation */}
            {step === 3 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <Card className={isDark ? 'bg-[#252542] border-white/10' : ''}>
                  <CardHeader>
                    <CardTitle className={`flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
                      <Check className="w-5 h-5 text-[#00C853]" />
                      Confirmer la commande
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Address Summary */}
                    <div className={`p-4 rounded-xl ${isDark ? 'bg-[#1A1A2E]' : 'bg-gray-50'}`}>
                      <h4 className={`font-medium mb-2 ${isDark ? 'text-white' : ''}`}>Adresse de livraison</h4>
                      <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                        {address.full_name}<br />
                        {address.address_line1}<br />
                        {address.city}, {address.country}<br />
                        {address.phone}
                      </p>
                    </div>

                    {/* Payment Summary */}
                    <div className={`p-4 rounded-xl ${isDark ? 'bg-[#1A1A2E]' : 'bg-gray-50'}`}>
                      <h4 className={`font-medium mb-2 ${isDark ? 'text-white' : ''}`}>Mode de paiement</h4>
                      <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                        {paymentMethod === 'paypal' && 'PayPal'}
                        {paymentMethod === 'mobile_money' && `Mobile Money - ${mobileMoneyProviders.find(p => p.id === mobileMoneyProvider)?.name}`}
                        {paymentMethod === 'cod' && 'Paiement à la livraison'}
                      </p>
                    </div>

                    <div className="flex gap-4">
                      <Button
                        variant="outline"
                        onClick={() => setStep(2)}
                        className="flex-1 rounded-full"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Retour
                      </Button>

                      {paymentMethod === 'paypal' && (
                        <div className="flex-1">
                          <PayPalScriptProvider options={{ clientId: "AZ_7XmenZrCYk1HfF4-eHSYRws2oh8FiSaCry1-DaC4cHNZ3Ica6wsBTkgEBJZ2eJ17a9rDhA26wmyrm" }}>
                            <PayPalButtons
                              createOrder={(data, actions) => {
                                return actions.order.create({
                                  purchase_units: [{
                                    amount: { value: finalTotal.toFixed(2) }
                                  }]
                                });
                              }}
                              onApprove={async (data, actions) => {
                                await actions.order.capture();
                                await createOrder('paypal');
                              }}
                            />
                          </PayPalScriptProvider>
                        </div>
                      )}

                      {paymentMethod === 'mobile_money' && (
                        <Button
                          onClick={otpSent ? handleMobileMoneyVerify : handleMobileMoneyInitiate}
                          disabled={loading || (otpSent && otp.length !== 6)}
                          className="flex-1 rounded-full bg-[#00C853] hover:bg-[#00A843] h-12"
                          data-testid="pay-mobile-money"
                        >
                          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : otpSent ? 'Confirmer le paiement' : 'Recevoir le code OTP'}
                        </Button>
                      )}

                      {paymentMethod === 'cod' && (
                        <Button
                          onClick={handleCODOrder}
                          disabled={loading}
                          className="flex-1 rounded-full bg-[#FFB300] hover:bg-[#E6A200] text-black h-12"
                          data-testid="pay-cod"
                        >
                          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmer la commande'}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className={`sticky top-24 ${isDark ? 'bg-[#252542] border-white/10' : ''}`}>
              <CardHeader>
                <CardTitle className={isDark ? 'text-white' : ''}>Résumé</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Items */}
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {cart.items?.map((item) => (
                    <div key={item.product_id} className="flex gap-3">
                      <img
                        src={item.product?.images?.[0] || 'https://via.placeholder.com/60'}
                        alt=""
                        className="w-14 h-14 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : ''}`}>
                          {item.product?.name}
                        </p>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          x{item.quantity}
                        </p>
                      </div>
                      <p className={`font-medium ${isDark ? 'text-white' : ''}`}>
                        ${item.item_total?.toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>

                <Separator className={isDark ? 'bg-white/10' : ''} />

                {/* Promo Code */}
                <div className="flex gap-2">
                  <Input
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder={t('promoCode')}
                    className={`flex-1 ${isDark ? 'bg-[#1A1A2E] border-white/10' : ''}`}
                    disabled={!!appliedPromo}
                  />
                  <Button
                    onClick={applyPromoCode}
                    variant="outline"
                    disabled={!!appliedPromo}
                    className="rounded-lg"
                  >
                    {t('apply')}
                  </Button>
                </div>

                {appliedPromo && (
                  <Alert className="bg-[#00C853]/10 border-[#00C853]">
                    <Check className="w-4 h-4 text-[#00C853]" />
                    <AlertDescription className="text-[#00C853]">
                      Code {appliedPromo.code} appliqué (-${promoDiscount.toFixed(2)})
                    </AlertDescription>
                  </Alert>
                )}

                <Separator className={isDark ? 'bg-white/10' : ''} />

                {/* Totals */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>{t('subtotal')}</span>
                    <span className={isDark ? 'text-white' : ''}>${cart.subtotal?.toFixed(2)}</span>
                  </div>
                  {promoDiscount > 0 && (
                    <div className="flex justify-between text-[#00C853]">
                      <span>Réduction</span>
                      <span>-${promoDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>{t('shipping')}</span>
                    <span className={cart.shipping === 0 ? 'text-[#00C853]' : isDark ? 'text-white' : ''}>
                      {cart.shipping === 0 ? t('freeShipping') : `$${cart.shipping?.toFixed(2)}`}
                    </span>
                  </div>
                  <Separator className={isDark ? 'bg-white/10' : ''} />
                  <div className="flex justify-between text-lg font-bold">
                    <span className={isDark ? 'text-white' : ''}>{t('total')}</span>
                    <span className="text-[#0066FF]">${finalTotal.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
