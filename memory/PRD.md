# Aréna Sport- és Rendezvényközpont - Foglalási Rendszer PRD

## Projekt Áttekintés
Multifunkcionális sport- és rendezvényközpont online foglalási rendszere, amely lehetővé teszi a felhasználók számára események böngészését és helyfoglalást.

## Felhasználói Perszonák
1. **Vendég** - Regisztráció nélkül foglalhat (név, email, telefon megadásával)
2. **Regisztrált felhasználó** - Foglal helyeket eseményekre, látja saját foglalásait
3. **Subadmin** - Kezeli a hozzárendelt sportok eseményeit és foglalásait
4. **Admin** - Teljes rendszerfelügyelet (sportok, események, subadminok, beállítások)

## Alapvető Követelmények
- Magyar nyelvű felület
- Világos téma, sport aréna design, fekete header
- Vendég és regisztrált foglalás
- SMTP email értesítések (konfigurálva)

## Implementált Funkciók

### V1.0 (2024.01.02)
- ✅ Főoldal sport kategóriákkal
- ✅ Sport események oldal
- ✅ Esemény részletek oldal foglalással
- ✅ Bejelentkezés / Regisztráció
- ✅ Foglalás leadása, listázása, lemondása
- ✅ Admin Dashboard statisztikákkal
- ✅ Sportok, Események, Subadminok CRUD
- ✅ JWT alapú authentikáció

### V1.1 (2024.01.02)
- ✅ Admin profil szerkesztés
- ✅ Sport képfeltöltés
- ✅ Oldal beállítások

### V1.2 (2024.01.02) - Új funkciók
- ✅ **Fekete header** - Minden oldalon egységes fekete navigációs sáv
- ✅ **Magasabb sport kártyák** - Kezdőlapon 72px magasság (előtte 48px)
- ✅ **Vendég foglalás** - Regisztráció nélküli foglalás modal:
  - Név (kötelező)
  - Email cím (kötelező)
  - Telefonszám (opcionális)
- ✅ **SMTP email konfiguráció** - Beállítva: mail.taurus-systems.cloud

### V1.3 (2025.03.04) - Kiegészítések
- ✅ **Végleges törlés** - Lemondott foglalások végleges törlése az adatbázisból
  - Megerősítő modal a véletlen törlés elkerülésére
  - Backend: `DELETE /api/admin/bookings/{id}/permanent`
  - Csak lemondott foglalások törölhetők véglegesen

## Architektúra
- **Backend**: FastAPI (Python)
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Adatbázis**: MongoDB
- **Auth**: JWT token (7 napos lejárat)
- **Képtárolás**: Helyi szerver (/uploads mappa)
- **Email**: SMTP (mail.taurus-systems.cloud:587)

## API Végpontok
- `/api/auth/*` - Authentikáció
- `/api/sports` - Sport kategóriák
- `/api/events` - Események
- `/api/bookings` - Foglalások (auth szükséges)
- `/api/bookings/guest` - Vendég foglalás (nincs auth)
- `/api/admin/*` - Admin műveletek
- `/api/settings` - Oldal beállítások
- `/api/upload` - Képfeltöltés

## Alapértelmezett Admin Belépés
- Email: admin@arena.hu
- Jelszó: admin123

## SMTP Konfiguráció
- Host: mail.taurus-systems.cloud
- Port: 587
- Email: noreply@hangesfenyberles.hu

## Prioritásos Backlog

### P0 - Kritikus
- ✅ Minden alapfunkció implementálva
- ✅ Vendég foglalás
- ✅ Email értesítések

### P1 - Fontos
- [ ] Jelszó visszaállítás (elfelejtett jelszó)
- [ ] Foglalás módosítás

### P2 - Kívánatos
- [ ] Esemény keresés/szűrés
- [ ] QR kódos beléptetés
- [ ] Foglalási előzmények export
