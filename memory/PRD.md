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
- [x] Panier (ajout, modification, suppression)
- [x] Checkout complet (PayPal, Mobile Money, COD)
- [x] Dashboard utilisateur
- [x] Dashboard admin (stats, graphiques, CRUD)
- [x] Chatbot IA (OpenAI SDK standard)
- [x] Codes promo (WELCOME10, TECH20)
- [x] SMS notifications via Twilio
- [x] Sparse index MongoDB pour email/phone

### Phase 2 - Paiements (Complete - 09/04/2026)
- [x] Stripe SUPPRIME
- [x] PayPal sandbox
- [x] Mobile Money RDC avec OTP ameliore (validation +243, countdown, resend, 5 tentatives max)
- [x] Paiement a la livraison

### Phase 3 - Admin Ameliore (Complete - 09/04/2026)
- [x] Upload d'images sur le serveur (single + multiple, max 5MB)
- [x] CRUD Categories complet (ajouter, modifier, supprimer)
- [x] Onglet Categories dans le dashboard admin
- [x] Formulaire produit avec upload multi-images
- [x] Preview images avec suppression
- [x] Support URL externe pour images
- [x] Fichiers servis via /uploads/ (FastAPI StaticFiles + Nginx alias)

### Phase 4 - Deploiement (Complete - 09/04/2026)
- [x] Scripts deploiement IONOS VPS
- [x] Guide DEPLOY_IONOS.md complet
- [x] Config Nginx (reverse proxy, SSL, uploads)
- [x] Service systemd (gunicorn + uvicorn)
- [x] Docker Compose alternative
- [x] Migration chatbot vers OpenAI SDK (compatible VPS)

## Endpoints API

### Auth
- POST /api/auth/register, /api/auth/login, /api/auth/logout, GET /api/auth/me

### Products
- GET /api/products, /api/products/{id}, /api/products/search, /api/products/brands/list

### Cart
- GET /api/cart, POST /api/cart/add, PUT /api/cart/update, DELETE /api/cart/remove, /api/cart/clear

### Orders
- POST /api/orders, GET /api/orders, /api/orders/{id}, /api/orders/track/{order_number}

### Payments
- POST /api/payments/mobile-money/initiate, /api/payments/mobile-money/resend-otp, /api/payments/mobile-money/verify

### Upload
- POST /api/upload (single), POST /api/upload/multiple

### Admin
- GET /api/admin/stats, /api/admin/orders, /api/admin/users, /api/admin/promo-codes
- POST/PUT/DELETE /api/admin/products, /api/admin/categories

### Other
- POST /api/chat, GET /api/categories, POST /api/reviews

## Taches Futures / Backlog

### P1
- [ ] Systeme de notifications en temps reel (WebSocket)

### P2
- [ ] Historique de recherche, Comparaison produits, Export PDF commandes

### P3
- [ ] Multi-langue complet, Google Analytics, Programme fidelite, Avis avec photos

## Credentials
- Admin: admin@techgadgets.com / Admin@123
- Promos: WELCOME10 (10%), TECH20 (20%)
