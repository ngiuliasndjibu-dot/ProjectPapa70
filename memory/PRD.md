# Lumière POS - Product Requirements Document

## Original Problem Statement
Application complète de gestion de restaurant POS (Point of Sale) avec séparation par départements (Cuisine / Bar), gestion tactile, impression automatique par département, fonctionnement hybride (local + cloud), mode offline-first pour connexion internet instable.

## User Choices
- Base de données: MongoDB
- Backend: FastAPI (Python)
- Impression: ESC/POS pour imprimantes thermiques (Epson TM-U220 et compatibles)
- Authentification: JWT personnalisée
- Interface: Mode clair avec images de plats/boissons
- Multi-devises: Devise de référence + devise de vente dynamiques
- Catégorisation: Famille > Catégorie > Article
- Architecture: Offline-First avec synchronisation automatique

## Architecture
- **Backend**: FastAPI + Motor (async MongoDB)
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Database**: MongoDB
- **Auth**: JWT tokens with bcrypt password hashing
- **Printing**: ESC/POS protocol via TCP/IP network
- **Offline**: IndexedDB + Service Worker architecture

## User Personas
1. **Administrateur** - Accès total au système
2. **Caissier** - Dashboard, paiements, tables
3. **Serveur** - POS, plan des tables
4. **Barman** - Affichage bar, bouteilles
5. **Cuisine** - Affichage cuisine

## Core Requirements (Static)
1. Gestion des tables avec plan visuel
2. Menu avec catégories hiérarchiques (Famille > Catégorie > Article)
3. Routage automatique des commandes par département
4. Gestion des paiements (espèces, carte, mobile money)
5. Gestion du stock et des bouteilles
6. Tableau de bord avec analytics
7. Gestion des utilisateurs et rôles
8. Système multi-devises dynamique
9. Impression ESC/POS sur imprimantes thermiques réseau
10. Mode offline-first avec synchronisation

## What's Been Implemented

### Session 2024-12-17
✅ **Système multi-devises complet**
   - Prix affichés dans la devise de vente (FC - Franc Congolais)
   - Paiement possible dans les deux devises (référence USD + vente FC)
   - CurrencyContext charge les devises après authentification
   - Conversion automatique entre devises

✅ **Gestion complète des utilisateurs**
   - Page de gestion des utilisateurs (/users)
   - CRUD complet : création, modification, suppression
   - Activation/désactivation des comptes
   - 5 rôles prédéfinis avec permissions détaillées
   - Onglet "Rôles & Privilèges" avec visualisation complète
   - API: POST/PUT/DELETE /api/users, GET /api/roles, GET /api/permissions

### Session 2024-12-16
✅ Guide d'installation Windows complet (Docker + Manuel)
✅ Service d'impression ESC/POS pour imprimantes thermiques
   - Support Epson TM-U220, TM-T20, TM-T88
   - Tickets cuisine/bar formatés
   - Reçus clients
   - Rapport de clôture de caisse
✅ Page de gestion des imprimantes dans le frontend
   - Test de connexion réseau
   - Impression de page test
   - Exécution des travaux d'impression
✅ API d'impression complète (/api/printers/test, /api/print-jobs/print)
✅ Mode offline amélioré dans api.js avec IndexedDB

### Session 2024-02-26
✅ Authentication JWT complète
✅ Dashboard avec statistiques et graphiques
✅ Plan des tables (15 tables)
✅ Point de vente tactile avec images
✅ Affichage Cuisine/Bar avec tickets
✅ Gestion du menu (CRUD complet)
✅ Gestion du stock et des bouteilles
✅ Paiements (espèces, carte, mobile money)
✅ Système multi-devises (10 devises: USD, EUR, XOF, XAF, CDF, GNF, MAD, TND, NGN, GBP)
✅ Catégorisation hiérarchique (Famille > Catégorie > Article)
✅ Architecture offline-first (IndexedDB, OfflineContext)
✅ Fichiers Docker pour déploiement local
✅ Seed data avec 28 articles menu

## Prioritized Backlog

### P0 (Critical) - DONE
- [x] Authentication
- [x] POS Core functionality
- [x] Order creation and routing
- [x] Department display (Kitchen/Bar)
- [x] Multi-currency system
- [x] ESC/POS printer integration

### P1 (High) - IN PROGRESS
- [x] Real printer integration (ESC/POS)
- [ ] Complete offline sync logic (structure ready)
- [ ] Order fusion/split

### P2 (Medium)
- [ ] Inventory tracking with recipes
- [ ] Customer reservations
- [ ] Loyalty program
- [ ] PDF daily reports

## API Endpoints
### Authentication
- POST /api/auth/login - Login
- POST /api/auth/register - Register
- GET /api/auth/me - Current user

### Core Operations
- GET/POST/PUT/DELETE /api/tables - Table management
- GET/POST/PUT/DELETE /api/menu - Menu management
- GET/POST/PUT/DELETE /api/menu/families - Menu families
- GET/POST/PUT/DELETE /api/menu/categories-full - Menu categories
- GET/POST /api/orders - Order management
- GET /api/orders/active - Active orders
- GET /api/orders/department/{department} - Orders by department
- GET/POST /api/payments - Payment processing

### Currency Management
- GET/POST/PUT/DELETE /api/currencies - Currency CRUD
- GET /api/currencies/active - Active currencies

### Printing
- GET/POST/PUT/DELETE /api/printers - Printer management
- POST /api/printers/{id}/test - Test printer connection
- POST /api/printers/{id}/print-test - Print test page
- GET/PUT /api/print-jobs - Print job management
- POST /api/print-jobs/{id}/print - Execute print job
- POST /api/orders/{id}/print-receipt - Print order receipt
- POST /api/reports/daily-close/print - Print daily close report

### Dashboard
- GET /api/dashboard/stats - Statistics
- GET /api/dashboard/hourly-sales - Hourly sales data

### Stock & Bottles
- GET/POST/PUT /api/stock - Stock management
- GET/POST/PUT /api/bottles - Bottle management

### Utilities
- POST /api/seed - Initialize test data

## Test Credentials
- Admin: admin / admin123
- Serveur: serveur1 / 123456
- Barman: barman1 / 123456
- Cuisine: cuisine1 / 123456
- Caissier: caisse1 / 123456

## Files Reference
- `/app/backend/server.py` - Main backend API
- `/app/backend/printer_service.py` - ESC/POS printing service
- `/app/frontend/src/lib/api.js` - API client with offline support
- `/app/frontend/src/lib/offlineStorage.js` - IndexedDB operations
- `/app/frontend/src/contexts/OfflineContext.js` - Offline state management
- `/app/frontend/src/pages/PrintersPage.jsx` - Printer management UI
- `/app/INSTALLATION_WINDOWS.md` - Windows installation guide
- `/app/docker-compose.yml` - Docker deployment config
