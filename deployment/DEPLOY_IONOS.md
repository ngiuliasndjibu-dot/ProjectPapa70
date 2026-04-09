# Guide de Déploiement - Hyper-Gadgets sur IONOS VPS

## Prérequis

- IONOS VPS (Linux Ubuntu 22.04 recommandé)
- Domaine configuré (ex: hyper-gadgets.cd)
- Accès SSH au serveur

## Étape 1: Connexion et Mise à jour du serveur

```bash
ssh root@votre-ip-ionos

# Mise à jour du système
sudo apt update && sudo apt upgrade -y

# Installer les dépendances essentielles
sudo apt install -y python3 python3-pip python3-venv nodejs npm nginx certbot python3-certbot-nginx git curl
```

## Étape 2: Installer MongoDB

```bash
# Importer la clé GPG de MongoDB
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Ajouter le repo
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Installer MongoDB
sudo apt update
sudo apt install -y mongodb-org

# Démarrer MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

**Alternative: Utiliser MongoDB Atlas (Cloud)**
- Créer un compte sur https://www.mongodb.com/atlas
- Créer un cluster gratuit
- Récupérer l'URL de connexion

## Étape 3: Cloner le projet

```bash
# Créer les répertoires
sudo mkdir -p /var/www/hyper-gadgets
cd /var/www/hyper-gadgets

# Cloner depuis GitHub (si vous avez push)
git clone https://github.com/votre-username/hyper-gadgets.git .

# OU uploader via SCP depuis votre machine locale
# scp -r /chemin/local/app/* root@votre-ip:/var/www/hyper-gadgets/
```

## Étape 4: Configurer le Backend

```bash
cd /var/www/hyper-gadgets/backend

# Créer l'environnement virtuel
python3 -m venv venv
source venv/bin/activate

# Installer les dépendances
pip install -r requirements.txt
pip install gunicorn

# Créer le fichier .env de production
nano .env
```

**Contenu de /var/www/hyper-gadgets/backend/.env:**
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=hypergadgets_prod
JWT_SECRET=CHANGEZ_CETTE_CLE_SECRETE_TRES_LONGUE_ET_COMPLEXE
ADMIN_EMAIL=admin@hyper-gadgets.cd
ADMIN_PASSWORD=VotreMotDePasseAdmin123!
STRIPE_API_KEY=sk_live_votre_cle_stripe
PAYPAL_CLIENT_ID=votre_client_id_paypal
PAYPAL_SECRET=votre_secret_paypal
TWILIO_ACCOUNT_SID=votre_sid_twilio
TWILIO_AUTH_TOKEN=votre_token_twilio
TWILIO_PHONE_NUMBER=+1234567890
EMERGENT_LLM_KEY=votre_cle_llm
```

```bash
# Tester que le backend démarre
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001
# Ctrl+C pour arrêter
```

## Étape 5: Configurer le service Systemd pour le Backend

```bash
sudo nano /etc/systemd/system/hypergadgets-backend.service
```

Copier le contenu du fichier `deployment/hypergadgets-backend.service`

```bash
# Activer et démarrer le service
sudo systemctl daemon-reload
sudo systemctl enable hypergadgets-backend
sudo systemctl start hypergadgets-backend

# Vérifier le statut
sudo systemctl status hypergadgets-backend
```

## Étape 6: Construire le Frontend

```bash
cd /var/www/hyper-gadgets/frontend

# Installer les dépendances
npm install

# Créer le fichier .env de production
nano .env
```

**Contenu de /var/www/hyper-gadgets/frontend/.env:**
```
REACT_APP_BACKEND_URL=https://hyper-gadgets.cd
```

```bash
# Construire le frontend
npm run build

# Le dossier 'build' contient les fichiers statiques
```

## Étape 7: Configurer Nginx

```bash
sudo nano /etc/nginx/sites-available/hyper-gadgets
```

Copier le contenu du fichier `deployment/nginx.conf`

```bash
# Activer le site
sudo ln -s /etc/nginx/sites-available/hyper-gadgets /etc/nginx/sites-enabled/

# Supprimer le site par défaut
sudo rm /etc/nginx/sites-enabled/default

# Tester la configuration
sudo nginx -t

# Redémarrer Nginx
sudo systemctl restart nginx
```

## Étape 8: Configurer SSL avec Let's Encrypt

```bash
sudo certbot --nginx -d hyper-gadgets.cd -d www.hyper-gadgets.cd

# Suivre les instructions
# Le certificat sera renouvelé automatiquement
```

## Étape 9: Configurer le Pare-feu

```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## Étape 10: Vérification finale

```bash
# Vérifier les services
sudo systemctl status hypergadgets-backend
sudo systemctl status nginx
sudo systemctl status mongod

# Tester l'API
curl https://hyper-gadgets.cd/api/products

# Visiter le site
# https://hyper-gadgets.cd
```

## Commandes utiles

```bash
# Logs du backend
sudo journalctl -u hypergadgets-backend -f

# Logs Nginx
sudo tail -f /var/log/nginx/error.log

# Redémarrer le backend après modification
sudo systemctl restart hypergadgets-backend

# Reconstruire le frontend après modification
cd /var/www/hyper-gadgets/frontend
npm run build
```

## Mise à jour du site

```bash
cd /var/www/hyper-gadgets
git pull origin main

# Backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart hypergadgets-backend

# Frontend
cd ../frontend
npm install
npm run build
```

## Sauvegardes MongoDB

```bash
# Créer une sauvegarde
mongodump --db hypergadgets_prod --out /var/backups/mongodb/$(date +%Y%m%d)

# Restaurer
mongorestore --db hypergadgets_prod /var/backups/mongodb/20240101/hypergadgets_prod
```
