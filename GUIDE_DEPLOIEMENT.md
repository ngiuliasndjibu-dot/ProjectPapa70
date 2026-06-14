# 🍽️ Egoli Pos — Guide d'installation et de déploiement

Ce document explique comment **installer Egoli Pos sur un PC** et comment le **déployer sur le cloud**.

L'application comporte 3 composants :
- **MongoDB** — base de données
- **Backend** — API FastAPI (Python), port `8001`
- **Frontend** — interface React servie par Nginx, port `3000`

---

## 1. Installation sur PC (recommandé : Docker)

C'est la méthode la plus simple : tout est automatisé, aucune dépendance à installer manuellement.

### 1.1 Prérequis
- **Docker Desktop**
  - Windows / macOS : https://www.docker.com/products/docker-desktop
  - Linux : `sudo apt install docker.io docker-compose-plugin`
- 4 Go de RAM minimum, 2 Go d'espace disque.

### 1.2 Étapes

```bash
# 1. Récupérer le code (ou copier le dossier du projet)
cd egoli-pos

# 2. Créer le fichier de configuration
cp .env.example .env

# 3. Éditer .env et définir au minimum une clé secrète JWT
#    Générer une clé : openssl rand -hex 32
#    (sous Windows PowerShell : [guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N"))

# 4. Construire et démarrer
docker compose up -d --build

# 5. Vérifier que tout tourne
docker compose ps
```

### 1.3 Première utilisation
1. Ouvrir le navigateur sur **http://localhost:3000**
2. Cliquer sur **« Initialiser la base de données »** (crée les comptes et données de démo)
3. Se connecter avec :
   - **admin / admin123** (administrateur)
4. Aller dans **Paramètres → Devises** pour configurer USD et CDF (devise de référence / vente) et le taux de change.

### 1.4 Arrêter / redémarrer
```bash
docker compose stop        # arrêter
docker compose start       # redémarrer
docker compose down        # tout arrêter et supprimer les conteneurs (les données restent)
docker compose down -v     # ⚠️ supprime AUSSI les données (volume MongoDB)
```

---

## 2. Installation manuelle sur PC (sans Docker)

À utiliser uniquement si vous ne pouvez pas installer Docker. Voir aussi `INSTALLATION_WINDOWS.md` pour le détail Windows.

### 2.1 Prérequis
- **MongoDB Community** : https://www.mongodb.com/try/download/community
- **Python 3.11+** : https://www.python.org/downloads/
- **Node.js 18+** et **Yarn** : https://nodejs.org + `npm install -g yarn`

### 2.2 Backend
```bash
cd backend
python -m venv venv
# Windows : venv\Scripts\activate   |  macOS/Linux : source venv/bin/activate
pip install -r requirements.txt

# Créer backend/.env :
#   MONGO_URL=mongodb://localhost:27017
#   DB_NAME=egoli_pos
#   JWT_SECRET=<votre_cle>
#   CORS_ORIGINS=http://localhost:3000

uvicorn server:app --host 0.0.0.0 --port 8001
```

### 2.3 Frontend
```bash
cd frontend
yarn install

# Créer frontend/.env :
#   REACT_APP_BACKEND_URL=http://localhost:8001

yarn start            # mode développement (http://localhost:3000)
# ou pour la production :
yarn build            # génère le dossier build/ à servir avec Nginx/Apache
```

---

## 3. Déploiement sur le cloud

Le moyen le plus direct est un **serveur VPS** (DigitalOcean, AWS EC2, OVH, Hetzner, Contabo…) avec Docker.

### 3.1 Préparer le serveur
```bash
# Sur un Ubuntu 22.04 fraîchement provisionné
sudo apt update && sudo apt install -y docker.io docker-compose-plugin
sudo usermod -aG docker $USER   # puis se reconnecter
```

### 3.2 Déployer l'application
```bash
# 1. Copier le projet sur le serveur (git clone ou scp)
cd egoli-pos
cp .env.example .env
```

Éditer `.env` avec les **valeurs de production** :
```env
DB_NAME=egoli_pos
JWT_SECRET=<clé générée avec openssl rand -hex 32>
CORS_ORIGINS=https://votre-domaine.com
REACT_APP_BACKEND_URL=https://api.votre-domaine.com
```

> ⚠️ **Important** : pour une application React (CRA), `REACT_APP_BACKEND_URL` est figée **au moment du build**. Si vous changez l'URL, il faut reconstruire le frontend (`docker compose up -d --build frontend`).

```bash
# 2. Construire et lancer
docker compose up -d --build
```

### 3.3 Nom de domaine + HTTPS (reverse proxy)
Pour exposer proprement l'app en HTTPS, placez un reverse proxy devant les conteneurs.
Exemple recommandé : **Caddy** (HTTPS automatique via Let's Encrypt).

`Caddyfile` :
```
votre-domaine.com {
    reverse_proxy localhost:3000
}

api.votre-domaine.com {
    reverse_proxy localhost:8001
}
```
Puis : `caddy run` (ou installer Caddy en service).

> Alternative : Nginx + Certbot pour les certificats SSL.

### 3.4 Options cloud managées (alternatives)
- **Base de données** : utiliser **MongoDB Atlas** (gratuit jusqu'à 512 Mo) au lieu du conteneur Mongo.
  → Mettre simplement `MONGO_URL=mongodb+srv://...` dans la configuration du backend, et supprimer le service `mongodb` du compose.
- **Backend** : Render, Railway, Fly.io (déployer le `Dockerfile` du dossier `backend`).
- **Frontend** : Vercel, Netlify ou Cloudflare Pages (build CRA), en définissant la variable `REACT_APP_BACKEND_URL` vers l'URL publique du backend.

---

## 4. Sauvegarde et restauration des données

```bash
# Sauvegarde (export de la base)
docker exec egoli_mongodb mongodump --db egoli_pos --archive=/data/db/backup.gz --gzip
docker cp egoli_mongodb:/data/db/backup.gz ./backup-$(date +%F).gz

# Restauration
docker cp ./backup.gz egoli_mongodb:/data/db/backup.gz
docker exec egoli_mongodb mongorestore --gzip --archive=/data/db/backup.gz
```

---

## 5. Mode hybride / hors-ligne
Egoli Pos est conçu **offline-first** : l'interface met en cache les données (menu, tables) et continue de fonctionner lors d'une coupure internet, puis se resynchronise au retour de la connexion. Pour un restaurant, l'idéal est d'avoir le **serveur local sur place** (PC/mini-PC) et, en option, une instance cloud pour le suivi à distance.

---

## 6. Dépannage rapide

| Problème | Solution |
|----------|----------|
| `JWT_SECRET` non défini au démarrage | Renseigner `JWT_SECRET` dans `.env` |
| Le frontend n'atteint pas l'API | Vérifier `REACT_APP_BACKEND_URL` puis **reconstruire** le frontend |
| Erreur CORS | Ajouter le domaine du frontend dans `CORS_ORIGINS` |
| Page blanche après changement d'URL | `docker compose up -d --build frontend` |
| Voir les logs | `docker compose logs -f backend` / `frontend` / `mongodb` |

---

**Comptes de démonstration** (après « Initialiser la base de données ») :
| Rôle | Identifiant | Mot de passe |
|------|-------------|--------------|
| Administrateur | admin | admin123 |
| Serveur | serveur1 | 123456 |
| Barman | barman1 | 123456 |
| Cuisine | cuisine1 | 123456 |
| Caissier | caisse1 | 123456 |

> 🔒 Pensez à modifier ces mots de passe en production (page **Utilisateurs**).
