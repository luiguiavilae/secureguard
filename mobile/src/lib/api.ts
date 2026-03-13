// TODO: Cliente HTTP para el backend FastAPI con interceptores de auth
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// TODO: Agregar interceptor para inyectar JWT token de Supabase
// TODO: Agregar interceptor de error para refresh token automático
