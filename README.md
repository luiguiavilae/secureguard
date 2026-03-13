# SecureGuard

Plataforma on-demand de seguridad privada para Lima, Perú.

## Repositorios

| Módulo | Tecnología | Descripción |
|--------|-----------|-------------|
| `backend/` | FastAPI + Python 3.11 | API REST + jobs de background |
| `mobile/` | React Native + Expo | App para clientes y agentes |
| `admin/` | Next.js 14 | Panel administrativo |
| `supabase/` | PostgreSQL | Migraciones de base de datos |

## Inicio Rápido

### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
uvicorn main:app --reload
```

### Mobile
```bash
cd mobile
npm install
npx expo start
```

### Admin
```bash
cd admin
npm install
npm run dev
```

## Documentación

Ver `CLAUDE.md` para arquitectura completa y decisiones de diseño.
