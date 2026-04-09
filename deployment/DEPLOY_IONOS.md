# Guide de Deploiement - Hyper-Gadgets sur IONOS VPS

## Prerequis

- IONOS VPS (Linux Ubuntu 22.04+ recommande)
- Domaine configure (ex: hyper-gadgets.cd)
- Acces SSH au serveur
- Compte Twilio (pour SMS/OTP Mobile Money)
- Compte PayPal Business (pour paiements PayPal)
- Cle API OpenAI (pour le chatbot IA) - optionnel

## Architecture

```
Client (Navigateur)
    |
    v
[Nginx] port 80/443
    |
    +-- /api/*  --> [Gunicorn + FastAPI] port 8001
    |
    +-- /*      --> Fichiers statiques React (build/)
    |
[MongoDB] port 27017
```

## Etape 1: Connexion et Mise a jour du serveur

```bash
ssh root@votre-ip-ionos

# Mise a jour du systeme
sudo apt update && sudo apt upgrade -y

# Installer les dependances essentielles
sudo apt install -y python3 python3-pip python3-venv nodejs npm nginx certbot python3-certbot-nginx git curl
```

## Etape 2: Installer MongoDB

```bash
# Importer la cle GPG de MongoDB
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Ajouter le repo
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Installer MongoDB
sudo apt update
sudo apt install -y mongodb-org

# Demarrer MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

**Alternative: Utiliser MongoDB Atlas (Cloud)**
- Creer un compte sur https://www.mongodb.com/atlas
- Creer un cluster gratuit
- Recuperer l'URL de connexion

## Etape 3: Cloner le projet

```bash
# Creer les repertoires
sudo mkdir -p /var/www/hyper-gadgets
cd /var/www/hyper-gadgets

# Cloner depuis GitHub
git clone https://github.com/votre-username/hyper-gadgets.git .

# OU uploader via SCP depuis votre machine locale
# scp -r /chemin/local/app/* root@votre-ip:/var/www/hyper-gadgets/
```

## Etape 4: Configurer le Backend

```bash
cd /var/www/hyper-gadgets/backend

# Creer l'environnement virtuel
python3 -m venv venv
source venv/bin/activate

# Installer les dependances
pip install -r requirements.txt
pip install gunicorn

# Creer le fichier .env de production
nano .env
```

**Contenu de /var/www/hyper-gadgets/backend/.env:**
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=hypergadgets_prod
JWT_SECRET=CHANGEZ_CETTE_CLE_SECRETE_TRES_LONGUE_ET_COMPLEXE
ADMIN_EMAIL=admin@hyper-gadgets.cd
ADMIN_PASSWORD=VotreMotDePasseAdmin123!
PAYPAL_CLIENT_ID=votre_client_id_paypal
PAYPAL_SECRET=votre_secret_paypal
TWILIO_ACCOUNT_SID=votre_sid_twilio
TWILIO_AUTH_TOKEN=votre_token_twilio
TWILIO_PHONE_NUMBER=+1234567890
OPENAI_API_KEY=sk-votre-cle-openai
```

> **Note importante**: Le chatbot utilise l'API OpenAI. Si vous ne souhaitez pas de chatbot, vous pouvez omettre `OPENAI_API_KEY` et le chatbot retournera un message d'erreur generique.

```bash
# Tester que le backend demarre
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001
# Ctrl+C pour arreter
```

## Etape 5: Service Systemd pour le Backend

```bash
# Creer le repertoire de logs
sudo mkdir -p /var/log/hypergadgets
sudo chown www-data:www-data /var/log/hypergadgets

sudo nano /etc/systemd/system/hypergadgets-backend.service
```

Copier le contenu du fichier `deployment/hypergadgets-backend.service`

```bash
# Activer et demarrer le service
sudo systemctl daemon-reload
sudo systemctl enable hypergadgets-backend
sudo systemctl start hypergadgets-backend

# Verifier le statut
sudo systemctl status hypergadgets-backend
```

## Etape 6: Construire le Frontend

```bash
cd /var/www/hyper-gadgets/frontend

# Installer les dependances
npm install

# Creer le fichier .env de production
nano .env
```

**Contenu de /var/www/hyper-gadgets/frontend/.env:**
```env
REACT_APP_BACKEND_URL=https://hyper-gadgets.cd
```

```bash
# Construire le frontend
npm run build

# Le dossier 'build' contient les fichiers statiques
```

## Etape 7: Configurer Nginx

```bash
sudo nano /etc/nginx/sites-available/hyper-gadgets
```

Copier le contenu du fichier `deployment/nginx.conf`

```bash
# Activer le site
sudo ln -s /etc/nginx/sites-available/hyper-gadgets /etc/nginx/sites-enabled/

# Supprimer le site par defaut
sudo rm -f /etc/nginx/sites-enabled/default

# Tester la configuration
sudo nginx -t

# Redemarrer Nginx
sudo systemctl restart nginx
```

## Etape 8: Configurer SSL avec Let's Encrypt

```bash
sudo certbot --nginx -d hyper-gadgets.cd -d www.hyper-gadgets.cd

# Suivre les instructions
# Le certificat sera renouvele automatiquement
```

## Etape 9: Configurer le Pare-feu

```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## Etape 10: Verification finale

```bash
# Verifier les services
sudo systemctl status hypergadgets-backend
sudo systemctl status nginx
sudo systemctl status mongod

# Tester l'API
curl https://hyper-gadgets.cd/api/products

# Visiter le site
# https://hyper-gadgets.cd
```

## Methodes de paiement configurees

| Methode | Configuration requise |
|---------|----------------------|
| **PayPal** | `PAYPAL_CLIENT_ID` + `PAYPAL_SECRET` dans .env |
| **Mobile Money** | `TWILIO_*` dans .env (SMS pour OTP) |
| **Paiement a la livraison** | Aucune configuration |

### Mobile Money - Operateurs supportes (RDC)
- M-Pesa (Vodacom)
- Airtel Money
- Orange Money
- Africell Money

Le flux Mobile Money fonctionne ainsi :
1. Le client choisit son operateur et entre son numero (+243...)
2. Un code OTP a 6 chiffres est envoye par SMS via Twilio
3. Le client entre le code pour confirmer le paiement
4. Protection contre le spam : 60s entre les demandes, max 5 tentatives
5. Expiration apres 10 minutes

## Commandes utiles

```bash
# Logs du backend
sudo journalctl -u hypergadgets-backend -f

# Logs Nginx
sudo tail -f /var/log/nginx/hyper-gadgets.error.log

# Redemarrer le backend apres modification
sudo systemctl restart hypergadgets-backend

# Reconstruire le frontend apres modification
cd /var/www/hyper-gadgets/frontend
npm run build
```

## Mise a jour du site

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
# Creer une sauvegarde
mongodump --db hypergadgets_prod --out /var/backups/mongodb/$(date +%Y%m%d)

# Restaurer
mongorestore --db hypergadgets_prod /var/backups/mongodb/20240101/hypergadgets_prod

# Automatiser (ajouter au crontab)
# 0 2 * * * mongodump --db hypergadgets_prod --out /var/backups/mongodb/$(date +\%Y\%m\%d) && find /var/backups/mongodb -mtime +7 -delete
```

## Deploiement avec Docker (Alternative)

Si vous preferez Docker :

```bash
cd /var/www/hyper-gadgets

# Creer .env a la racine
nano .env
```

```env
JWT_SECRET=votre_secret
ADMIN_EMAIL=admin@hyper-gadgets.cd
ADMIN_PASSWORD=VotreMotDePasse123!
PAYPAL_CLIENT_ID=votre_client_id
PAYPAL_SECRET=votre_secret
TWILIO_ACCOUNT_SID=votre_sid
TWILIO_AUTH_TOKEN=votre_token
TWILIO_PHONE_NUMBER=+1234567890
OPENAI_API_KEY=sk-votre-cle
DOMAIN_URL=https://hyper-gadgets.cd
```

```bash
docker-compose up -d
```

## Depannage

| Probleme | Solution |
|----------|----------|
| Backend ne demarre pas | `sudo journalctl -u hypergadgets-backend -n 50` |
| 502 Bad Gateway | Verifier que le backend tourne: `sudo systemctl status hypergadgets-backend` |
| MongoDB erreur | `sudo systemctl restart mongod` |
| SSL expire | `sudo certbot renew` |
| Mobile Money OTP non recu | Verifier les credentials Twilio dans .env |
