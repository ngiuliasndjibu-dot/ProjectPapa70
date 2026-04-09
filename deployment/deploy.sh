#!/bin/bash

# Script de déploiement automatique pour Hyper-Gadgets
# Usage: ./deploy.sh

set -e

echo "🚀 Déploiement de Hyper-Gadgets..."

# Variables
APP_DIR="/var/www/hyper-gadgets"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}📦 Mise à jour du code...${NC}"
cd $APP_DIR
git pull origin main

echo -e "${YELLOW}🐍 Mise à jour du backend...${NC}"
cd $BACKEND_DIR
source venv/bin/activate
pip install -r requirements.txt --quiet
deactivate

echo -e "${YELLOW}🔄 Redémarrage du backend...${NC}"
sudo systemctl restart hypergadgets-backend

echo -e "${YELLOW}⚛️ Construction du frontend...${NC}"
cd $FRONTEND_DIR
npm install --silent
npm run build

echo -e "${YELLOW}🔄 Redémarrage de Nginx...${NC}"
sudo systemctl reload nginx

echo -e "${GREEN}✅ Déploiement terminé!${NC}"

# Vérification
echo -e "${YELLOW}📊 Statut des services:${NC}"
sudo systemctl status hypergadgets-backend --no-pager -l | head -5
sudo systemctl status nginx --no-pager -l | head -5

echo -e "${GREEN}🌐 Site disponible sur https://hyper-gadgets.cd${NC}"
