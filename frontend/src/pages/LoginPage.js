import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Phone, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

export const LoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const { login, register } = useAuth();
  const { isDark } = useTheme();
  const { t } = useLanguage();

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Form data
  const [loginData, setLoginData] = useState({ identifier: '', password: '' });
  const [registerData, setRegisterData] = useState({ name: '', email: '', phone: '', password: '' });

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(loginData.identifier, loginData.password);
    
    if (result.success) {
      navigate(redirect);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (!registerData.email && !registerData.phone) {
      setError('Veuillez entrer un email ou un numéro de téléphone');
      return;
    }

    if (registerData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);

    const result = await register({
      name: registerData.name,
      email: registerData.email || null,
      phone: registerData.phone || null,
      password: registerData.password
    });

    if (result.success) {
      navigate(redirect);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#1A1A2E]' : 'bg-[#F8FAFC]'} flex items-center justify-center py-12 px-4`} data-testid="auth-page">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`w-full max-w-md p-8 rounded-3xl ${isDark ? 'bg-[#252542]' : 'bg-white shadow-xl'}`}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-[#0066FF] flex items-center justify-center">
              <span className="text-white font-bold text-xl">HG</span>
            </div>
          </Link>
          <h1 className={`text-2xl font-bold mt-4 ${isDark ? 'text-white' : 'text-[#1A1A2E]'}`}>
            {isLogin ? t('login') : t('register')}
          </h1>
          <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {isLogin ? 'Connectez-vous à votre compte' : 'Créez un nouveau compte'}
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={isLogin ? 'login' : 'register'} onValueChange={(v) => { setIsLogin(v === 'login'); setError(''); }}>
          <TabsList className={`w-full mb-6 ${isDark ? 'bg-[#1A1A2E]' : ''}`}>
            <TabsTrigger value="login" className="flex-1">{t('login')}</TabsTrigger>
            <TabsTrigger value="register" className="flex-1">{t('register')}</TabsTrigger>
          </TabsList>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
              {error}
            </div>
          )}

          {/* Login Form */}
          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label className={isDark ? 'text-gray-300' : ''}>{t('email')} ou {t('phone')}</Label>
                <div className="relative">
                  <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                  <Input
                    type="text"
                    value={loginData.identifier}
                    onChange={(e) => setLoginData({ ...loginData, identifier: e.target.value })}
                    placeholder="email@exemple.com ou +243..."
                    className={`pl-10 ${isDark ? 'bg-[#1A1A2E] border-white/10' : ''}`}
                    required
                    data-testid="login-identifier"
                  />
                </div>
              </div>

              <div>
                <Label className={isDark ? 'text-gray-300' : ''}>{t('password')}</Label>
                <div className="relative">
                  <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    placeholder="••••••••"
                    className={`pl-10 pr-10 ${isDark ? 'bg-[#1A1A2E] border-white/10' : ''}`}
                    required
                    data-testid="login-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-[#0066FF] hover:bg-[#3385FF] btn-glow h-12"
                data-testid="login-submit"
              >
                {loading ? 'Connexion...' : t('login')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          </TabsContent>

          {/* Register Form */}
          <TabsContent value="register">
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <Label className={isDark ? 'text-gray-300' : ''}>{t('name')} *</Label>
                <div className="relative">
                  <User className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                  <Input
                    type="text"
                    value={registerData.name}
                    onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                    placeholder="Votre nom"
                    className={`pl-10 ${isDark ? 'bg-[#1A1A2E] border-white/10' : ''}`}
                    required
                    data-testid="register-name"
                  />
                </div>
              </div>

              <div>
                <Label className={isDark ? 'text-gray-300' : ''}>{t('email')}</Label>
                <div className="relative">
                  <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                  <Input
                    type="email"
                    value={registerData.email}
                    onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                    placeholder="email@exemple.com"
                    className={`pl-10 ${isDark ? 'bg-[#1A1A2E] border-white/10' : ''}`}
                    data-testid="register-email"
                  />
                </div>
              </div>

              <div>
                <Label className={isDark ? 'text-gray-300' : ''}>{t('phone')}</Label>
                <div className="relative">
                  <Phone className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                  <Input
                    type="tel"
                    value={registerData.phone}
                    onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                    placeholder="+243 xxx xxx xxx"
                    className={`pl-10 ${isDark ? 'bg-[#1A1A2E] border-white/10' : ''}`}
                    data-testid="register-phone"
                  />
                </div>
              </div>

              <div>
                <Label className={isDark ? 'text-gray-300' : ''}>{t('password')} *</Label>
                <div className="relative">
                  <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                    placeholder="Min 6 caractères"
                    className={`pl-10 pr-10 ${isDark ? 'bg-[#1A1A2E] border-white/10' : ''}`}
                    required
                    data-testid="register-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                * Email ou numéro de téléphone requis
              </p>

              <Button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-[#0066FF] hover:bg-[#3385FF] btn-glow h-12"
                data-testid="register-submit"
              >
                {loading ? 'Création...' : t('register')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        {/* Back to shop */}
        <p className={`text-center mt-6 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          <Link to="/shop" className="text-[#0066FF] hover:underline">
            Continuer sans compte
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;
