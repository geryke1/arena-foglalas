# Aréna Sport- és Rendezvényközpont - Foglalási Rendszer PRD

## Projekt Áttekintés
Multifunkcionális sport- és rendezvényközpont online foglalási rendszere, amely lehetővé teszi a felhasználók számára események böngészését és helyfoglalást.

## Felhasználói Perszonák
1. **Vendég** - Böngészi a sportokat és eseményeket
2. **Regisztrált felhasználó** - Foglal helyeket eseményekre
3. **Subadmin** - Kezeli a hozzárendelt sportok eseményeit és foglalásait
4. **Admin** - Teljes rendszerfelügyelet (sportok, események, subadminok, beállítások)

## Alapvető Követelmények
- Magyar nyelvű felület
- Világos téma, sport aréna design
- Regisztráció alapú foglalás (fizetés nélkül)
- SMTP email értesítések (konfigurálható)

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

### V1.1 (2024.01.02) - Új funkciók
- ✅ **Admin profil szerkesztés** - Név, email, telefonszám, jelszó módosítás
- ✅ **Sport képfeltöltés** - Fájl feltöltés szerverre (nem URL link)
- ✅ **Oldal beállítások** (csak admin):
  - Oldal neve
  - Oldal logó (feltöltés)
  - Hero szekció: főcím, alcím, háttérkép (feltöltés)
  - Lábléc szöveg, logó (feltöltés)

## Architektúra
- **Backend**: FastAPI (Python)
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Adatbázis**: MongoDB
- **Auth**: JWT token (7 napos lejárat)
- **Képtárolás**: Helyi szerver (/uploads mappa)

## API Végpontok
- `/api/auth/*` - Authentikáció (beleértve profil frissítés)
- `/api/sports` - Sport kategóriák
- `/api/events` - Események
- `/api/bookings` - Foglalások
- `/api/admin/*` - Admin műveletek
- `/api/settings` - Oldal beállítások
- `/api/upload` - Képfeltöltés

## Alapértelmezett Admin Belépés
- Email: admin@arena.hu
- Jelszó: admin123

## Prioritásos Backlog

### P0 - Kritikus
- ✅ Minden alapfunkció implementálva
- ✅ Admin profil és jelszó módosítás
- ✅ Oldal testreszabás

### P1 - Fontos
- [ ] SMTP konfiguráció UI-ból
- [ ] Jelszó visszaállítás (elfelejtett jelszó)

### P2 - Kívánatos
- [ ] Esemény keresés/szűrés
- [ ] Foglalási előzmények export
- [ ] Admin értesítések
- [ ] Többnyelvűsítés

## Következő Lépések
1. SMTP beállítások megadása email értesítésekhez
2. Sportok és események hozzáadása (képfeltöltéssel)
3. Oldal testreszabása a Beállítások menüben
