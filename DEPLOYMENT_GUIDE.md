# 🚀 Telepítési Útmutató - Aréna Foglalási Rendszer

Ez az útmutató lépésről lépésre végigvezet az alkalmazás saját szerveren történő telepítésén.

---

## 📋 Szerver Követelmények

### Minimális hardver
- 1 vCPU
- 1 GB RAM
- 10 GB tárhely

### Szükséges szoftverek
- **Ubuntu 20.04+** vagy **Debian 11+** (ajánlott)
- **Python 3.10+**
- **Node.js 18+** és **npm/yarn**
- **MongoDB 6.0+**
- **Nginx** (reverse proxy)
- **Git**

---

## 1️⃣ Szerver Előkészítése

### Szoftverek telepítése (Ubuntu/Debian)

```bash
# Rendszer frissítése
sudo apt update && sudo apt upgrade -y

# Alapvető csomagok
sudo apt install -y git curl wget build-essential

# Python 3.10+ telepítése
sudo apt install -y python3 python3-pip python3-venv

# Node.js 18 telepítése
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Yarn telepítése (ajánlott npm helyett)
npm install -g yarn

# Nginx telepítése
sudo apt install -y nginx

# MongoDB telepítése
curl -fsSL https://www.mongodb.org/static/pgp/server-6.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/mongodb-archive-keyring.gpg] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org

# MongoDB indítása
sudo systemctl start mongod
sudo systemctl enable mongod
```

---

## 2️⃣ Alkalmazás Letöltése

```bash
# Alkalmazás mappa létrehozása
sudo mkdir -p /var/www/arena
sudo chown $USER:$USER /var/www/arena
cd /var/www/arena

# Git repo klónozása (cseréld ki a saját repo URL-edre!)
git clone https://github.com/FELHASZNALONEV/REPO_NEV.git .

# Vagy ha már megvan a repo:
# git pull origin main
```

---

## 3️⃣ Backend Beállítása

### 3.1 Python virtuális környezet

```bash
cd /var/www/arena/backend

# Virtuális környezet létrehozása
python3 -m venv venv

# Aktiválása
source venv/bin/activate

# Függőségek telepítése
pip install --upgrade pip
pip install -r requirements.txt
```

### 3.2 Backend környezeti változók (.env)

Hozd létre a `/var/www/arena/backend/.env` fájlt:

```bash
nano /var/www/arena/backend/.env
```

Tartalom:
```env
# MongoDB kapcsolat
MONGO_URL=mongodb://localhost:27017
DB_NAME=arena_booking

# JWT titkos kulcs (generálj egy egyedit!)
JWT_SECRET=GENERÁLJ_EGY_HOSSZÚ_RANDOM_STRINGET_IDE

# SMTP beállítások (email küldéshez)
SMTP_HOST=mail.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASS=email_jelszo
SMTP_FROM=noreply@example.com
```

**JWT_SECRET generálása:**
```bash
openssl rand -hex 32
```

### 3.3 Feltöltési mappa létrehozása

```bash
mkdir -p /var/www/arena/backend/uploads
chmod 755 /var/www/arena/backend/uploads
```

---

## 4️⃣ Frontend Beállítása

### 4.1 Függőségek telepítése

```bash
cd /var/www/arena/frontend

# Függőségek telepítése
yarn install
```

### 4.2 Frontend környezeti változók (.env)

Hozd létre a `/var/www/arena/frontend/.env` fájlt:

```bash
nano /var/www/arena/frontend/.env
```

Tartalom:
```env
# Backend API URL (a te domaineddel!)
REACT_APP_BACKEND_URL=https://arena.example.com
```

### 4.3 Production build készítése

```bash
cd /var/www/arena/frontend
yarn build
```

Ez létrehoz egy `build` mappát a kész, optimalizált frontend fájlokkal.

---

## 5️⃣ Systemd Service Létrehozása (Backend)

A backend folyamatos futtatásához hozz létre egy systemd service-t:

```bash
sudo nano /etc/systemd/system/arena-backend.service
```

Tartalom:
```ini
[Unit]
Description=Arena Booking Backend
After=network.target mongod.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/arena/backend
Environment="PATH=/var/www/arena/backend/venv/bin"
ExecStart=/var/www/arena/backend/venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Jogosultságok és indítás:
```bash
# Mappa jogosultságok
sudo chown -R www-data:www-data /var/www/arena

# Service engedélyezése és indítása
sudo systemctl daemon-reload
sudo systemctl enable arena-backend
sudo systemctl start arena-backend

# Állapot ellenőrzése
sudo systemctl status arena-backend
```

---

## 6️⃣ Nginx Konfiguráció

### 6.1 Nginx site konfiguráció

```bash
sudo nano /etc/nginx/sites-available/arena
```

Tartalom:
```nginx
server {
    listen 80;
    server_name arena.example.com;  # Cseréld a saját domainedre!

    # Frontend (React build)
    root /var/www/arena/frontend/build;
    index index.html;

    # Feltöltött fájlok elérése
    location /uploads/ {
        alias /var/www/arena/backend/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Backend API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Fájlfeltöltéshez
        client_max_body_size 10M;
    }

    # React Router támogatás (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 6.2 Site engedélyezése

```bash
# Symlink létrehozása
sudo ln -s /etc/nginx/sites-available/arena /etc/nginx/sites-enabled/

# Konfiguráció tesztelése
sudo nginx -t

# Nginx újraindítása
sudo systemctl restart nginx
```

---

## 7️⃣ SSL Tanúsítvány (HTTPS)

A Let's Encrypt ingyenes SSL tanúsítványhoz:

```bash
# Certbot telepítése
sudo apt install -y certbot python3-certbot-nginx

# Tanúsítvány beszerzése (cseréld a domaint!)
sudo certbot --nginx -d arena.example.com

# Automatikus megújítás tesztelése
sudo certbot renew --dry-run
```

---

## 8️⃣ Tűzfal Beállítása

```bash
# UFW engedélyezése
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw enable
```

---

## 9️⃣ Első Indítás és Ellenőrzés

### Backend állapot
```bash
sudo systemctl status arena-backend
```

### Logok megtekintése
```bash
# Backend logok
sudo journalctl -u arena-backend -f

# Nginx logok
sudo tail -f /var/log/nginx/error.log
```

### Tesztelés
```bash
# API teszt
curl http://localhost:8001/api/sports

# Böngészőből
# Nyisd meg: https://arena.example.com
```

---

## 🔧 Gyakori Problémák és Megoldások

### MongoDB nem indul
```bash
sudo systemctl status mongod
sudo journalctl -u mongod -n 50
```

### Backend 502 Bad Gateway
```bash
# Ellenőrizd fut-e a backend
sudo systemctl status arena-backend

# Nézd meg a logokat
sudo journalctl -u arena-backend -n 100
```

### Frontend nem tölt be
```bash
# Ellenőrizd a build mappát
ls -la /var/www/arena/frontend/build

# Ha üres, futtasd újra:
cd /var/www/arena/frontend && yarn build
```

### Jogosultsági problémák
```bash
sudo chown -R www-data:www-data /var/www/arena
sudo chmod -R 755 /var/www/arena
```

---

## 🔄 Frissítés Új Verzióra

```bash
cd /var/www/arena

# Legújabb kód letöltése
git pull origin main

# Backend frissítése
cd backend
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart arena-backend

# Frontend újraépítése
cd ../frontend
yarn install
yarn build

# Nginx újraindítása (opcionális)
sudo systemctl restart nginx
```

---

## 📞 Támogatás

Ha elakadtál, ellenőrizd:
1. A logokat (`journalctl` és nginx logok)
2. A környezeti változókat (.env fájlok)
3. A jogosultságokat
4. Hogy minden szolgáltatás fut-e

---

**Készítette:** Emergent AI  
**Verzió:** 1.0  
**Dátum:** 2025.03.04
