# ===========================================
# GUIDE D'INSTALLATION LOCALE - Lumière POS
# ===========================================
# Solution hybride : Fonctionne hors ligne + synchronisation cloud
# Idéal pour l'Afrique avec connexion internet instable
# ===========================================

## OPTION 1 : Installation avec Docker (Recommandée)

### Prérequis
- Docker Desktop installé : https://docs.docker.com/get-docker/
- Git installé

### Étapes

```bash
# 1. Cloner le repository (après export vers GitHub)
git clone https://github.com/votre-username/lumiere-pos.git
cd lumiere-pos

# 2. Lancer les services
docker-compose up -d

# 3. Ouvrir le navigateur
# Frontend : http://localhost:3000
# Backend API : http://localhost:8001/docs

# 4. Initialiser la base de données
curl -X POST http://localhost:8001/api/seed
```

### Commandes utiles

```bash
# Voir les logs
docker-compose logs -f

# Arrêter les services
docker-compose down

# Redémarrer
docker-compose restart

# Mettre à jour après modification du code
docker-compose up -d --build
```

---

## OPTION 2 : Installation manuelle (sans Docker)

### Prérequis
- Python 3.9+
- Node.js 18+
- MongoDB 6.0+

### Étapes

```bash
# 1. Installer MongoDB
# Ubuntu/Debian :
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# 2. Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Créer le fichier .env
cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=lumiere_pos
JWT_SECRET=votre-secret-jwt-securise
CORS_ORIGINS=http://localhost:3000
EOF

# Lancer le backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# 3. Frontend (dans un nouveau terminal)
cd frontend

# Créer le fichier .env
cat > .env << EOF
REACT_APP_BACKEND_URL=http://localhost:8001
EOF

yarn install
yarn start
```

---

## CONFIGURATION HYBRIDE (Local + Cloud)

Pour synchroniser avec un serveur cloud quand internet est disponible :

### 1. Configurer le serveur cloud

Déployez une instance sur :
- Railway.app (gratuit pour démarrer)
- Render.com
- DigitalOcean
- AWS / Google Cloud

### 2. Variables d'environnement pour la sync

Ajoutez dans le `.env` du backend local :

```env
# URL de votre serveur cloud
CLOUD_SYNC_URL=https://votre-serveur-cloud.com
CLOUD_SYNC_API_KEY=votre-cle-api-sync
```

### 3. Fonctionnement

1. **Mode normal (avec internet)** :
   - Les commandes sont créées sur le serveur cloud
   - Les données sont téléchargées en cache local

2. **Mode hors ligne** :
   - Les commandes sont sauvegardées localement (IndexedDB)
   - Un indicateur orange apparaît dans la sidebar
   - Numéros de commande temporaires (9000+)

3. **Quand internet revient** :
   - Synchronisation automatique
   - Les commandes locales sont envoyées au cloud
   - Les vrais numéros de commande sont assignés

---

## FONCTIONNEMENT OFFLINE

### Ce qui fonctionne hors ligne :
✅ Consultation du menu
✅ Création de commandes
✅ Mise à jour du statut des commandes
✅ Affichage Cuisine/Bar
✅ Consultation des tables

### Ce qui nécessite internet :
⚠️ Connexion initiale (pour télécharger les données)
⚠️ Paiements par carte
⚠️ Tableau de bord (statistiques)
⚠️ Gestion des utilisateurs

---

## SAUVEGARDE DES DONNÉES

### Sauvegarde MongoDB locale

```bash
# Créer une sauvegarde
mongodump --db lumiere_pos --out /chemin/backup/$(date +%Y%m%d)

# Restaurer une sauvegarde
mongorestore --db lumiere_pos /chemin/backup/20240226/lumiere_pos
```

### Sauvegarde automatique (cron)

```bash
# Éditer le crontab
crontab -e

# Ajouter cette ligne pour sauvegarde quotidienne à 2h du matin
0 2 * * * mongodump --db lumiere_pos --out /backup/mongodb/$(date +\%Y\%m\%d) --gzip
```

---

## DÉPANNAGE

### Le backend ne démarre pas
```bash
# Vérifier que MongoDB tourne
sudo systemctl status mongod

# Vérifier les logs
tail -f /var/log/mongodb/mongod.log
```

### Erreur de connexion frontend-backend
```bash
# Vérifier que le backend répond
curl http://localhost:8001/api/health

# Vérifier les CORS dans .env
CORS_ORIGINS=http://localhost:3000
```

### Problème de synchronisation
- Vérifiez la connexion internet
- Cliquez sur le bouton "Synchroniser" dans la barre d'état
- Consultez les logs dans la console du navigateur (F12)

---

## SUPPORT

Pour toute question : consultez la documentation ou créez une issue sur GitHub.

Bonne utilisation ! 🚀
