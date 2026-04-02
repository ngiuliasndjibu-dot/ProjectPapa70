import React from 'react';
import { motion } from 'framer-motion';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from './ui/sheet';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';

export const CartSheet = () => {
  const { cart, isOpen, closeCart, updateQuantity, removeItem, loading } = useCart();
  const { isDark } = useTheme();
  const { t, language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleCheckout = () => {
    closeCart();
    if (!isAuthenticated) {
      navigate('/login?redirect=/checkout');
    } else {
      navigate('/checkout');
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={closeCart}>
      <SheetContent 
        side="right" 
        className={`w-full sm:max-w-lg flex flex-col ${isDark ? 'bg-[#1A1A2E] border-white/10' : 'bg-white'}`}
        data-testid="cart-sheet"
      >
        <SheetHeader>
          <SheetTitle className={`flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
            <ShoppingBag className="w-5 h-5 text-[#0066FF]" />
            {t('yourCart')} ({cart.items?.length || 0})
          </SheetTitle>
        </SheetHeader>

        {cart.items?.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <ShoppingBag className={`w-16 h-16 mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
            <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t('emptyCart')}</p>
            <Button
              onClick={() => { closeCart(); navigate('/shop'); }}
              className="mt-4 rounded-full bg-[#0066FF] hover:bg-[#3385FF]"
            >
              {t('shopNow')}
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-4 py-4">
                {cart.items?.map((item, idx) => {
                  const product = item.product;
                  const displayName = language === 'en' && product?.name_en ? product.name_en : product?.name;
                  
                  return (
                    <motion.div
                      key={item.product_id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`flex gap-4 p-3 rounded-xl ${isDark ? 'bg-[#252542]' : 'bg-gray-50'}`}
                      data-testid={`cart-item-${item.product_id}`}
                    >
                      <img
                        src={product?.images?.[0] || 'https://via.placeholder.com/100'}
                        alt={displayName}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {displayName}
                        </h4>
                        <p className="text-[#0066FF] font-semibold mt-1">
                          ${product?.price?.toFixed(2)}
                        </p>
                        
                        <div className="flex items-center justify-between mt-2">
                          <div className={`flex items-center gap-2 rounded-full px-2 py-1 ${
                            isDark ? 'bg-[#1A1A2E]' : 'bg-white border'
                          }`}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 rounded-full"
                              onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                              disabled={loading}
                              data-testid={`decrease-qty-${item.product_id}`}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className={`w-8 text-center text-sm ${isDark ? 'text-white' : ''}`}>
                              {item.quantity}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 rounded-full"
                              onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                              disabled={loading}
                              data-testid={`increase-qty-${item.product_id}`}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            onClick={() => removeItem(item.product_id)}
                            disabled={loading}
                            data-testid={`remove-item-${item.product_id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </ScrollArea>

            <div className={`pt-4 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>{t('subtotal')}</span>
                  <span className={isDark ? 'text-white' : ''}>${cart.subtotal?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>{t('shipping')}</span>
                  <span className={cart.shipping === 0 ? 'text-[#00C853]' : isDark ? 'text-white' : ''}>
                    {cart.shipping === 0 ? t('freeShipping') : `$${cart.shipping?.toFixed(2)}`}
                  </span>
                </div>
                <Separator className={isDark ? 'bg-white/10' : ''} />
                <div className="flex justify-between text-lg font-bold">
                  <span className={isDark ? 'text-white' : ''}>{t('total')}</span>
                  <span className="text-[#0066FF]">${cart.total?.toFixed(2)}</span>
                </div>
              </div>

              <Button
                onClick={handleCheckout}
                className="w-full rounded-full bg-[#0066FF] hover:bg-[#3385FF] btn-glow h-12"
                disabled={loading}
                data-testid="checkout-btn"
              >
                {t('checkout')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CartSheet;
