# Hyper-Gadgets - PRD (Product Requirements Document)

## Probleme Original
Creer un site e-commerce moderne "Hyper-Gadgets" pour gadgets technologiques, cible RDC.

## Stack Technique
- **Frontend**: React.js, Tailwind CSS, Shadcn UI, Framer Motion, Recharts
- **Backend**: FastAPI (Python), MongoDB (Motor async), JWT Auth, Bcrypt
- **Paiements**: PayPal, Mobile Money RDC (M-Pesa, Airtel, Orange, Africell), Cash on Delivery
- **SMS/OTP**: Twilio
- **Chatbot**: OpenAI GPT (via OpenAI SDK standard - compatible VPS)
- **Deploiement**: IONOS VPS avec Nginx, Gunicorn, MongoDB

## Fonctionnalites Implementees

### Phase 1 - MVP Core (Complete)
- [x] Authentification JWT (login/register)
- [x] Page d'accueil style Amazon/AliExpress
- [x] Catalogue produits avec filtres
- [x] Page detail produit
- [x] Panier + Checkout (PayPal, Mobile Money, COD)
- [x] Dashboard utilisateur + Admin (stats, graphiques, CRUD)
- [x] Chatbot IA (OpenAI SDK), Codes promo, SMS Twilio

### Phase 2 - Paiements (Complete - 09/04/2026)
- [x] Stripe SUPPRIME
- [x] Mobile Money RDC avec OTP ameliore (validation +243, countdown, resend, 5 tentatives max)

### Phase 3 - Admin Ameliore (Complete - 09/04/2026)
- [x] Upload d'images sur le serveur (single + multiple, max 5MB)
- [x] CRUD Categories complet
- [x] Formulaire produit avec upload multi-images

### Phase 4 - Bannieres Promotionnelles (Complete - 09/04/2026)
- [x] CRUD Bannieres depuis le dashboard Admin
- [x] Onglet "Bannieres" avec formulaire complet (titre, sous-titre, image, degrade, lien, bouton, position, actif/inactif)
- [x] Apercu en temps reel dans le formulaire
- [x] Page d'accueil charge les bannieres dynamiquement depuis l'API
- [x] Carousel auto-rotatif (5s) avec dots de navigation
- [x] 3 bannieres par defaut seedees au demarrage
- [x] Seules les bannieres actives sont affichees cote public

### Phase 5 - Deploiement (Complete - 09/04/2026)
- [x] Scripts deploiement IONOS VPS complets
- [x] Migration chatbot vers OpenAI SDK standard
- [x] Config Nginx mise a jour (uploads, banners)

## Endpoints API

### Auth
POST /api/auth/register, /api/auth/login, /api/auth/logout, GET /api/auth/me

### Products
GET /api/products, /api/products/{id}, /api/products/search, /api/products/brands/list

### Cart & Orders
GET /api/cart, POST /api/cart/add, /api/orders, GET /api/orders

### Payments
POST /api/payments/mobile-money/initiate, /resend-otp, /verify

### Upload
POST /api/upload (single), POST /api/upload/multiple

### Banners
GET /api/banners (public, actives), GET /api/admin/banners (all)
POST /api/admin/banners, PUT /api/admin/banners/{id}, DELETE /api/admin/banners/{id}

### Admin
GET /api/admin/stats, /orders, /users, /promo-codes
POST/PUT/DELETE /api/admin/products, /api/admin/categories

## Taches Futures / Backlog

### P1
- [ ] Notifications temps reel (WebSocket)

### P2
- [ ] Historique de recherche, Comparaison produits, Export PDF commandes

### P3
- [ ] Multi-langue complet, Google Analytics, Programme fidelite, Avis avec photos

## Credentials
- Admin: admin@techgadgets.com / Admin@123
- Promos: WELCOME10 (10%), TECH20 (20%)
