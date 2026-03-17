# ============================================
# GUIDE D'INSTALLATION WINDOWS - Lumière POS
# ============================================
# Application Point de Vente pour Restaurant
# Compatible Windows 10/11
# ============================================

## TABLE DES MATIÈRES
1. [Prérequis](#prérequis)
2. [Option 1 : Installation avec Docker (Recommandée)](#option-1-docker)
3. [Option 2 : Installation Manuelle](#option-2-manuelle)
4. [Configuration des Imprimantes](#configuration-imprimantes)
5. [Premier Lancement](#premier-lancement)
6. [Dépannage](#dépannage)
7. [Mise à jour](#mise-à-jour)

---

## PRÉREQUIS

### Configuration minimale requise
- **Système** : Windows 10 (64-bit) version 1903 ou supérieur / Windows 11
- **RAM** : 4 GB minimum (8 GB recommandé)
- **Stockage** : 10 GB d'espace libre
- **Processeur** : Intel Core i3 ou équivalent
- **Réseau** : Connexion internet pour l'installation initiale

### Logiciels à télécharger (selon l'option choisie)

| Logiciel | Option Docker | Option Manuelle | Lien |
|----------|---------------|-----------------|------|
| Docker Desktop | ✅ Requis | ❌ Non requis | [Télécharger](https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe) |
| Git | ✅ Requis | ✅ Requis | [Télécharger](https://git-scm.com/download/win) |
| Node.js 18+ | ❌ Non requis | ✅ Requis | [Télécharger](https://nodejs.org/dist/v20.10.0/node-v20.10.0-x64.msi) |
| Python 3.10+ | ❌ Non requis | ✅ Requis | [Télécharger](https://www.python.org/ftp/python/3.11.7/python-3.11.7-amd64.exe) |
| MongoDB 6.0 | ❌ Non requis | ✅ Requis | [Télécharger](https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-6.0.12-signed.msi) |

---

## OPTION 1 : INSTALLATION AVEC DOCKER (Recommandée) {#option-1-docker}

Cette méthode est la plus simple et installe automatiquement tous les composants.

### Étape 1 : Installer Docker Desktop

1. **Téléchargez** Docker Desktop depuis : https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe

2. **Exécutez** le fichier d'installation `Docker Desktop Installer.exe`

3. **Pendant l'installation**, cochez :
   - ☑️ "Use WSL 2 instead of Hyper-V"
   - ☑️ "Add shortcut to desktop"

4. **Redémarrez** votre ordinateur si demandé

5. **Lancez** Docker Desktop et attendez qu'il soit complètement démarré (icône stable dans la barre des tâches)

> **Note** : Si Windows vous demande d'activer WSL 2, ouvrez PowerShell en administrateur et exécutez :
> ```powershell
> wsl --install
> ```
> Puis redémarrez.

### Étape 2 : Installer Git

1. Téléchargez Git : https://git-scm.com/download/win
2. Installez avec les options par défaut
3. Redémarrez votre terminal

### Étape 3 : Télécharger le projet

1. **Ouvrez PowerShell** (clic droit sur le menu Démarrer > "Windows PowerShell")

2. **Naviguez** vers le dossier où vous voulez installer l'application :
   ```powershell
   cd C:\Users\VotreNom\Documents
   ```

3. **Clonez** le projet (après l'avoir exporté vers GitHub) :
   ```powershell
   git clone https://github.com/VOTRE-USERNAME/lumiere-pos.git
   cd lumiere-pos
   ```

### Étape 4 : Configuration

1. **Créez le fichier de configuration** backend :
   ```powershell
   # Créer le fichier .env pour le backend
   @"
   MONGO_URL=mongodb://mongodb:27017
   DB_NAME=lumiere_pos
   JWT_SECRET=votre-cle-secrete-unique-changez-ceci-$(Get-Random)
   CORS_ORIGINS=http://localhost:3000
   "@ | Out-File -FilePath .\backend\.env -Encoding utf8
   ```

2. **Créez le fichier de configuration** frontend :
   ```powershell
   @"
   REACT_APP_BACKEND_URL=http://localhost:8001
   "@ | Out-File -FilePath .\frontend\.env -Encoding utf8
   ```

### Étape 5 : Lancer l'application

```powershell
# Construire et démarrer les conteneurs
docker-compose up -d --build

# Vérifier que tout fonctionne
docker-compose ps
```

### Étape 6 : Initialiser la base de données

```powershell
# Attendre 30 secondes que les services démarrent, puis initialiser
Start-Sleep -Seconds 30
Invoke-RestMethod -Uri "http://localhost:8001/api/seed" -Method Post
```

### Accéder à l'application

- **Application** : http://localhost:3000
- **API Documentation** : http://localhost:8001/docs

**Identifiants par défaut** :
- Utilisateur : `admin`
- Mot de passe : `admin123`

### Commandes utiles Docker

```powershell
# Voir les logs en temps réel
docker-compose logs -f

# Arrêter l'application
docker-compose down

# Redémarrer l'application
docker-compose restart

# Mettre à jour après modification du code
docker-compose up -d --build

# Supprimer tout et recommencer
docker-compose down -v
docker-compose up -d --build
```

---

## OPTION 2 : INSTALLATION MANUELLE {#option-2-manuelle}

Si vous préférez ne pas utiliser Docker ou avez besoin de plus de contrôle.

### Étape 1 : Installer Python

1. **Téléchargez** Python 3.11 : https://www.python.org/ftp/python/3.11.7/python-3.11.7-amd64.exe

2. **Pendant l'installation**, IMPORTANT :
   - ☑️ Cochez "Add Python to PATH"
   - ☑️ Cochez "Install pip"

3. **Vérifiez** l'installation :
   ```powershell
   python --version
   # Doit afficher : Python 3.11.x
   ```

### Étape 2 : Installer Node.js

1. **Téléchargez** Node.js 20 LTS : https://nodejs.org/dist/v20.10.0/node-v20.10.0-x64.msi

2. **Installez** avec les options par défaut

3. **Installez Yarn** (gestionnaire de paquets) :
   ```powershell
   npm install -g yarn
   ```

4. **Vérifiez** :
   ```powershell
   node --version
   # Doit afficher : v20.x.x
   
   yarn --version
   # Doit afficher : 1.22.x
   ```

### Étape 3 : Installer MongoDB

1. **Téléchargez** MongoDB Community : https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-6.0.12-signed.msi

2. **Pendant l'installation** :
   - Choisissez "Complete" installation
   - ☑️ Cochez "Install MongoDB as a Service"
   - ☑️ Cochez "Install MongoDB Compass" (interface graphique optionnelle)

3. **Vérifiez** que MongoDB fonctionne :
   ```powershell
   # Le service doit être "Running"
   Get-Service MongoDB
   ```

### Étape 4 : Télécharger et configurer le projet

```powershell
# Cloner le projet
cd C:\Users\VotreNom\Documents
git clone https://github.com/VOTRE-USERNAME/lumiere-pos.git
cd lumiere-pos
```

### Étape 5 : Configurer le Backend

```powershell
cd backend

# Créer un environnement virtuel
python -m venv venv

# Activer l'environnement virtuel
.\venv\Scripts\Activate.ps1

# Installer les dépendances
pip install -r requirements.txt

# Créer le fichier .env
@"
MONGO_URL=mongodb://localhost:27017
DB_NAME=lumiere_pos
JWT_SECRET=votre-cle-secrete-unique-changez-ceci
CORS_ORIGINS=http://localhost:3000
"@ | Out-File -FilePath .env -Encoding utf8
```

### Étape 6 : Configurer le Frontend

```powershell
cd ..\frontend

# Installer les dépendances
yarn install

# Créer le fichier .env
@"
REACT_APP_BACKEND_URL=http://localhost:8001
"@ | Out-File -FilePath .env -Encoding utf8
```

### Étape 7 : Créer les scripts de démarrage

**Créez le fichier `start-backend.bat`** dans le dossier racine :
```batch
@echo off
echo Demarrage du Backend Lumiere POS...
cd backend
call venv\Scripts\activate.bat
python -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

**Créez le fichier `start-frontend.bat`** dans le dossier racine :
```batch
@echo off
echo Demarrage du Frontend Lumiere POS...
cd frontend
yarn start
```

**Créez le fichier `start-all.bat`** pour tout démarrer d'un coup :
```batch
@echo off
echo ========================================
echo    LUMIERE POS - Demarrage
echo ========================================

echo.
echo Verification de MongoDB...
sc query MongoDB | find "RUNNING" > nul
if errorlevel 1 (
    echo MongoDB n'est pas demarre. Demarrage...
    net start MongoDB
)
echo MongoDB: OK

echo.
echo Demarrage du Backend...
start "Lumiere POS - Backend" cmd /k "cd backend && venv\Scripts\activate.bat && python -m uvicorn server:app --host 0.0.0.0 --port 8001"

echo Attente de 5 secondes...
timeout /t 5 /nobreak > nul

echo.
echo Demarrage du Frontend...
start "Lumiere POS - Frontend" cmd /k "cd frontend && yarn start"

echo.
echo ========================================
echo Application demarree!
echo - Frontend: http://localhost:3000
echo - Backend:  http://localhost:8001/docs
echo ========================================
echo.
echo Appuyez sur une touche pour ouvrir le navigateur...
pause > nul
start http://localhost:3000
```

### Étape 8 : Premier lancement

1. **Double-cliquez** sur `start-all.bat`
2. **Attendez** que les deux fenêtres de terminal soient prêtes
3. **Ouvrez** http://localhost:3000

---

## CONFIGURATION DES IMPRIMANTES {#configuration-imprimantes}

### Imprimantes supportées
- **Epson TM-U220** (série TM-U)
- **Epson TM-T20** / TM-T88
- **Toute imprimante compatible ESC/POS**

### Configuration réseau

1. **Connectez** l'imprimante au même réseau que l'ordinateur
2. **Notez** l'adresse IP de l'imprimante (généralement visible dans le menu de configuration de l'imprimante)
3. **Port standard** : 9100

### Ajouter une imprimante dans l'application

1. Connectez-vous en tant qu'administrateur
2. Allez dans **Paramètres** > **Imprimantes**
3. Cliquez sur **Ajouter une imprimante**
4. Remplissez :
   - **Nom** : ex. "Imprimante Cuisine"
   - **Département** : Cuisine ou Bar
   - **Adresse IP** : ex. 192.168.1.100
   - **Port** : 9100

### Test d'impression

```powershell
# Tester la connexion à l'imprimante (remplacez l'IP)
Test-NetConnection -ComputerName 192.168.1.100 -Port 9100
```

### Configuration USB (Alternative)

Si votre imprimante est connectée en USB :
1. Installez le pilote Windows de l'imprimante
2. Partagez l'imprimante sur le réseau Windows
3. Utilisez le nom de partage comme adresse

---

## PREMIER LANCEMENT {#premier-lancement}

### Initialiser les données de test

Après le premier démarrage, initialisez la base de données :

**Option Docker** :
```powershell
Invoke-RestMethod -Uri "http://localhost:8001/api/seed" -Method Post
```

**Option Manuelle** :
```powershell
curl -X POST http://localhost:8001/api/seed
```

### Connexion

- **URL** : http://localhost:3000
- **Utilisateur** : `admin`
- **Mot de passe** : `admin123`

### Étapes recommandées après l'installation

1. ✅ Changez le mot de passe administrateur
2. ✅ Configurez vos devises (Paramètres > Devises)
3. ✅ Ajoutez vos imprimantes
4. ✅ Créez vos articles de menu
5. ✅ Configurez le plan de salle

---

## DÉPANNAGE {#dépannage}

### Docker ne démarre pas

**Symptôme** : "Docker Desktop is not running"

**Solution** :
1. Ouvrez Docker Desktop
2. Attendez que l'icône devienne verte
3. Réessayez

### MongoDB ne démarre pas

**Symptôme** : Erreur de connexion à la base de données

**Solution** :
```powershell
# Vérifier le service
Get-Service MongoDB

# Démarrer si arrêté
Start-Service MongoDB
```

### Port 3000 ou 8001 déjà utilisé

**Symptôme** : "Port already in use"

**Solution** :
```powershell
# Trouver le processus qui utilise le port
netstat -ano | findstr :3000
# ou
netstat -ano | findstr :8001

# Terminer le processus (remplacez PID par le numéro trouvé)
taskkill /PID <PID> /F
```

### L'imprimante ne répond pas

**Vérifications** :
1. Vérifiez que l'imprimante est allumée
2. Vérifiez la connexion réseau
3. Testez avec :
   ```powershell
   Test-NetConnection -ComputerName <IP_IMPRIMANTE> -Port 9100
   ```

### Erreur "yarn: command not found"

```powershell
npm install -g yarn
```

### Erreur Python "Module not found"

```powershell
cd backend
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

---

## MISE À JOUR {#mise-à-jour}

### Avec Docker

```powershell
cd lumiere-pos

# Arrêter les conteneurs
docker-compose down

# Télécharger les mises à jour
git pull

# Reconstruire et redémarrer
docker-compose up -d --build
```

### Installation manuelle

```powershell
cd lumiere-pos

# Télécharger les mises à jour
git pull

# Mettre à jour le backend
cd backend
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Mettre à jour le frontend
cd ..\frontend
yarn install

# Redémarrer l'application
```

---

## SAUVEGARDE DES DONNÉES

### Sauvegarde MongoDB

```powershell
# Créer une sauvegarde
mongodump --db lumiere_pos --out C:\Backup\MongoDB\$(Get-Date -Format "yyyyMMdd")

# Restaurer une sauvegarde
mongorestore --db lumiere_pos C:\Backup\MongoDB\20240101\lumiere_pos
```

### Sauvegarde automatique (Tâche planifiée)

1. Ouvrez le **Planificateur de tâches** Windows
2. Créez une nouvelle tâche
3. Configurez pour exécuter quotidiennement :
   ```
   mongodump --db lumiere_pos --out C:\Backup\MongoDB\%date:~-4,4%%date:~-10,2%%date:~-7,2%
   ```

---

## SUPPORT

Pour toute question ou problème :
- Consultez la documentation API : http://localhost:8001/docs
- Vérifiez les logs : `docker-compose logs` ou les fenêtres de terminal

---

**Bonne utilisation de Lumière POS ! 🍽️**
