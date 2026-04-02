import React from 'react';
import { Link } from 'react-router-dom';
import { Package, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Youtube } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { Input } from './ui/input';
import { Button } from './ui/button';

export const Footer = () => {
  const { isDark } = useTheme();
  const { t } = useLanguage();

  const footerLinks = {
    shop: [
      { label: 'Smartphones', href: '/shop?category=smartphones' },
      { label: 'Laptops', href: '/shop?category=laptops' },
      { label: 'Audio', href: '/shop?category=audio' },
      { label: 'Wearables', href: '/shop?category=wearables' },
      { label: 'Gaming', href: '/shop?category=gaming' },
    ],
    support: [
      { label: t('contactUs'), href: '/contact' },
      { label: t('faq'), href: '/faq' },
      { label: t('trackOrder'), href: '/track' },
      { label: 'Retours', href: '/returns' },
    ],
    company: [
      { label: t('aboutUs'), href: '/about' },
      { label: t('privacyPolicy'), href: '/privacy' },
      { label: t('termsOfService'), href: '/terms' },
    ],
  };

  return (
    <footer className={`${isDark ? 'bg-[#0D0D1A]' : 'bg-gray-900'} text-white`} data-testid="main-footer">
      {/* Newsletter Section */}
      <div className={`${isDark ? 'bg-[#252542]' : 'bg-gray-800'} py-12`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-2xl font-bold mb-2">{t('newsletter')}</h3>
              <p className="text-gray-400">{t('newsletterText')}</p>
            </div>
            <form className="flex gap-2 w-full md:w-auto">
              <Input
                type="email"
                placeholder="votre@email.com"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 rounded-full px-6 min-w-[250px]"
                data-testid="newsletter-email"
              />
              <Button className="rounded-full bg-[#0066FF] hover:bg-[#3385FF] btn-glow" data-testid="newsletter-submit">
                {t('subscribe')}
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#0066FF] flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl">
                Tech<span className="text-[#0066FF]">Gadgets</span>
              </span>
            </Link>
            <p className="text-gray-400 mb-6 max-w-sm">
              Votre destination pour les meilleurs gadgets technologiques en RDC. Livraison rapide, paiement sécurisé.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-gray-400">
                <MapPin className="w-5 h-5 text-[#0066FF]" />
                <span>Kinshasa, RD Congo</span>
              </div>
              <div className="flex items-center gap-3 text-gray-400">
                <Phone className="w-5 h-5 text-[#0066FF]" />
                <span>+243 123 456 789</span>
              </div>
              <div className="flex items-center gap-3 text-gray-400">
                <Mail className="w-5 h-5 text-[#0066FF]" />
                <span>contact@techgadgets.cd</span>
              </div>
            </div>
          </div>

          {/* Shop Links */}
          <div>
            <h4 className="font-semibold text-lg mb-4">{t('shop')}</h4>
            <ul className="space-y-3">
              {footerLinks.shop.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-gray-400 hover:text-[#0066FF] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Support</h4>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-gray-400 hover:text-[#0066FF] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Entreprise</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-gray-400 hover:text-[#0066FF] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Payment Methods & Social */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <span className="text-gray-400 text-sm">Paiements acceptés:</span>
              <div className="flex items-center gap-2">
                <div className="px-3 py-1 bg-white/10 rounded text-xs font-medium">VISA</div>
                <div className="px-3 py-1 bg-white/10 rounded text-xs font-medium">Mastercard</div>
                <div className="px-3 py-1 bg-white/10 rounded text-xs font-medium">PayPal</div>
                <div className="px-3 py-1 bg-white/10 rounded text-xs font-medium">M-Pesa</div>
                <div className="px-3 py-1 bg-white/10 rounded text-xs font-medium">Airtel</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#0066FF] transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#0066FF] transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#0066FF] transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#0066FF] transition-colors">
                <Youtube className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} TechGadgets. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
