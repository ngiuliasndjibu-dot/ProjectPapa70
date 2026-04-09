# Hyper-Gadgets - PRD (Product Requirements Document)

## Probleme Original
Creer un site e-commerce moderne "Hyper-Gadgets" pour gadgets technologiques, cible RDC (Republique Democratique du Congo).

## Stack Technique
- **Frontend**: React.js, Tailwind CSS, Shadcn UI, Framer Motion
- **Backend**: FastAPI (Python), MongoDB (Motor async), JWT Auth, Bcrypt
- **Paiements**: PayPal, Mobile Money RDC (M-Pesa, Airtel, Orange, Africell), Cash on Delivery
- **SMS/OTP**: Twilio
- **Chatbot**: OpenAI GPT (via Emergent LLM Key en dev / OpenAI SDK en prod)
- **Deploiement**: IONOS VPS avec Nginx, Gunicorn, MongoDB

## Fonctionnalites Implementees (Complet)

### Phase 1 - MVP Core (Complete)
- [x] Authentification JWT (login/register avec email ou telephone)
- [x] Page d'accueil style Amazon/AliExpress avec bannières, flash sales, categories
- [x] Catalogue produits avec filtres (categorie, prix, marque, note)
- [x] Page detail produit avec avis et produits similaires
- [x] Panier (ajout, modification, suppression)
- [x] Checkout complet avec 3 methodes de paiement
- [x] Dashboard utilisateur (commandes, adresses, wishlist)
- [x] Dashboard admin (stats, CRUD produits, gestion commandes/utilisateurs)
- [x] Chatbot IA
- [x] Systeme de codes promo (WELCOME10, TECH20)
- [x] SMS notifications via Twilio (statut commandes)
- [x] Protection brute force login
- [x] Sparse index MongoDB pour email/phone

### Phase 2 - Paiements (Complete - 09/04/2026)
- [x] **Stripe SUPPRIME** (par demande utilisateur)
- [x] PayPal (sandbox configure)
- [x] Mobile Money RDC avec flux OTP ameliore:
  - Validation numero +243XXXXXXXXX
  - Envoi OTP 6 chiffres par SMS Twilio
  - Compteur 60s avant renvoi
  - Endpoint /resend-otp
  - Max 5 tentatives OTP
  - Expiration 10 minutes
  - Protection anti-spam (cooldown 60s)
- [x] Paiement a la livraison (COD)

### Phase 3 - Deploiement (Complete - 09/04/2026)
- [x] Scripts de deploiement IONOS VPS
- [x] Guide DEPLOY_IONOS.md complet
- [x] Configuration Nginx (reverse proxy, SSL, gzip)
- [x] Service systemd (gunicorn + uvicorn workers)
- [x] Docker Compose (alternative)
- [x] Script deploy.sh automatise
- [x] Zip telechargeables a /tmp/hyper-gadgets.zip

## Endpoints API

### Auth
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me
- POST /api/auth/refresh

### Products
- GET /api/products (filtres: category, brand, price, sort, search)
- GET /api/products/{id}
- GET /api/products/search?q=
- GET /api/products/brands/list

### Cart
- GET /api/cart
- POST /api/cart/add
- PUT /api/cart/update
- DELETE /api/cart/remove/{product_id}
- DELETE /api/cart/clear
- POST /api/cart/promo?code=

### Orders
- POST /api/orders
- GET /api/orders
- GET /api/orders/{id}
- GET /api/orders/track/{order_number}

### Payments
- POST /api/payments/mobile-money/initiate
- POST /api/payments/mobile-money/resend-otp
- POST /api/payments/mobile-money/verify

### Admin
- GET /api/admin/stats
- GET /api/admin/orders
- PUT /api/admin/orders/{id}/status
- POST /api/admin/products
- PUT /api/admin/products/{id}
- DELETE /api/admin/products/{id}
- GET /api/admin/users
- POST /api/admin/categories
- POST /api/admin/promo-codes
- GET /api/admin/promo-codes

### Other
- POST /api/chat
- GET /api/categories
- POST /api/reviews

## Taches Futures / Backlog

### P1 - Haute Priorite
- [ ] Migration chatbot vers OpenAI SDK standard (pour deploiement IONOS sans Emergent LLM Key)

### P2 - Moyenne Priorite
- [ ] Systeme de notifications en temps reel (WebSocket)
- [ ] Historique de recherche utilisateur
- [ ] Systeme de comparaison de produits
- [ ] Export commandes en PDF

### P3 - Basse Priorite
- [ ] Mode multi-langue complet (FR/EN)
- [ ] Integration Google Analytics
- [ ] Programme de fidelite / points
- [ ] Systeme d'avis avec photos

## Schema Base de Donnees
- **users**: email (sparse unique), phone (sparse unique), password_hash, role, name, addresses, wishlist
- **products**: id, name, price, category, brand, images, specifications, stock, ratings
- **orders**: id, order_number, user_id, items, total, shipping_address, payment_method, status
- **carts**: user_id, items
- **reviews**: product_id, user_id, rating, comment
- **payment_transactions**: id, user_id, amount, provider, otp, status
- **promo_codes**: code, discount_type, discount_value, uses
- **categories**: id, name, slug
- **chat_history**: session_id, messages
- **login_attempts**: identifier, count, lockout_until

## Credentials
- Admin: admin@techgadgets.com / Admin@123
- Promo codes: WELCOME10 (10% min $50), TECH20 (20% min $200)
