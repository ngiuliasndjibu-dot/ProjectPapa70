# Lumière POS - Product Requirements Document

## Original Problem Statement
Application complète de gestion de restaurant POS (Point of Sale) avec séparation par départements (Cuisine / Bar), gestion tactile et impression automatique par département.

## User Choices
- Base de données: MongoDB
- Backend: FastAPI (Python)
- Impression: Simulation avec possibilité d'intégration réelle
- Authentification: JWT personnalisée
- Interface: Mode clair avec images de plats/boissons

## Architecture
- **Backend**: FastAPI + Motor (async MongoDB)
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Database**: MongoDB
- **Auth**: JWT tokens with bcrypt password hashing

## User Personas
1. **Administrateur** - Accès total au système
2. **Caissier** - Dashboard, paiements, tables
3. **Serveur** - POS, plan des tables
4. **Barman** - Affichage bar, bouteilles
5. **Cuisine** - Affichage cuisine

## Core Requirements (Static)
1. Gestion des tables avec plan visuel
2. Menu avec catégories et départements (Cuisine/Bar)
3. Routage automatique des commandes par département
4. Gestion des paiements (espèces, carte, mobile money)
5. Gestion du stock et des bouteilles
6. Tableau de bord avec analytics
7. Gestion des utilisateurs et rôles

## What's Been Implemented (2024-02-26)
✅ Authentication JWT complète
✅ Dashboard avec statistiques et graphiques
✅ Plan des tables (15 tables, drag & drop ready)
✅ Point de vente tactile avec images
✅ Affichage Cuisine avec tickets
✅ Affichage Bar avec tickets
✅ Gestion du menu (CRUD complet)
✅ Gestion du stock
✅ Gestion des bouteilles avec calcul shots
✅ Paiements (espèces, carte, mobile money)
✅ Paramètres (utilisateurs, imprimantes)
✅ Routage automatique par département
✅ Seed data avec 28 articles menu

## Prioritized Backlog

### P0 (Critical) - DONE
- [x] Authentication
- [x] POS Core functionality
- [x] Order creation and routing
- [x] Department display (Kitchen/Bar)

### P1 (High)
- [ ] Real printer integration
- [ ] Order fusion/split
- [ ] Inventory tracking with recipes

### P2 (Medium)
- [ ] Customer reservations
- [ ] Loyalty program
- [ ] Multi-location support

## Next Tasks
1. Intégration réelle des imprimantes thermiques
2. Système de réservation avec calendrier
3. Rapport journalier PDF
4. Export des données
5. Mode hors ligne

## API Endpoints
- POST /api/auth/login - Authentication
- POST /api/seed - Initialize test data
- GET/POST/PUT/DELETE /api/tables - Table management
- GET/POST/PUT/DELETE /api/menu - Menu management
- GET/POST /api/orders - Order management
- GET/POST /api/payments - Payment processing
- GET/POST/PUT /api/stock - Stock management
- GET/POST/PUT /api/bottles - Bottle management
- GET/POST/PUT/DELETE /api/printers - Printer configuration
- GET /api/dashboard/stats - Dashboard statistics

## Test Credentials
- Admin: admin / admin123
- Serveur: serveur1 / 123456
- Barman: barman1 / 123456
- Cuisine: cuisine1 / 123456
- Caissier: caisse1 / 123456
