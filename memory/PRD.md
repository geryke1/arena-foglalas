# Aréna Sport- és Rendezvényközpont - Foglalási Rendszer PRD

## Projekt Áttekintés
Multifunkcionális sport- és rendezvényközpont online foglalási rendszere, amely lehetővé teszi a felhasználók számára események böngészését és helyfoglalást.

## Felhasználói Perszonák
1. **Vendég** - Böngészi a sportokat és eseményeket
2. **Regisztrált felhasználó** - Foglal helyeket eseményekre
3. **Subadmin** - Kezeli a hozzárendelt sportok eseményeit és foglalásait
4. **Admin** - Teljes rendszerfelügyelet (sportok, események, subadminok)

## Alapvető Követelmények
- Magyar nyelvű felület
- Világos téma, sport aréna design
- Regisztráció alapú foglalás (fizetés nélkül)
- SMTP email értesítések (konfigurálható)

## Implementált Funkciók (2024.01.02)

### Nyilvános oldalak
- ✅ Főoldal sport kategóriákkal
- ✅ Sport események oldal
- ✅ Esemény részletek oldal foglalással
- ✅ Bejelentkezés / Regisztráció

### Felhasználói funkciók
- ✅ Foglalás leadása
- ✅ Saját foglalások listázása
- ✅ Foglalás lemondása

### Admin Panel
- ✅ Dashboard statisztikákkal
- ✅ Sportok CRUD (létrehozás, módosítás, törlés)
- ✅ Események CRUD (borítókép feltöltéssel)
- ✅ Subadminok kezelése (sport hozzárendeléssel)
- ✅ Foglalások adminisztrálása

### Subadmin Panel
- ✅ Saját sportok eseményeinek kezelése
- ✅ Saját sportok foglalásainak adminisztrálása

### Technikai
- ✅ JWT alapú authentikáció
- ✅ Szerepkör alapú jogosultságkezelés
- ✅ Képfeltöltés helyi tárolással
- ✅ Email küldés SMTP-vel (konfiguráció szükséges)

## Architektúra
- **Backend**: FastAPI (Python)
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Adatbázis**: MongoDB
- **Auth**: JWT token (7 napos lejárat)

## API Végpontok
- `/api/auth/*` - Authentikáció
- `/api/sports` - Sport kategóriák
- `/api/events` - Események
- `/api/bookings` - Foglalások
- `/api/admin/*` - Admin műveletek
- `/api/upload` - Képfeltöltés

## Alapértelmezett Admin Belépés
- Email: admin@arena.hu
- Jelszó: admin123

## Prioritásos Backlog

### P0 - Kritikus
- ✅ Minden alapfunkció implementálva

### P1 - Fontos
- [ ] SMTP konfiguráció UI-ból
- [ ] Jelszó visszaállítás
- [ ] Felhasználói profil szerkesztés

### P2 - Kívánatos
- [ ] Esemény keresés/szűrés
- [ ] Foglalási előzmények export
- [ ] Admin értesítések
- [ ] Többnyelvűsítés

## Következő Lépések
1. SMTP beállítások megadása email értesítésekhez
2. Sportok és események hozzáadása az admin felületen
3. Subadminok létrehozása szükség szerint
