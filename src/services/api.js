import axios from "axios";

const CLAVE = "casapluma_sesion";
export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1" });

export function sesion() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE)) || null;
  } catch {
    return null;
  }
}

export async function iniciarSesion(usuario, password) {
  const { data } = await api.post("/auth/login", { usuario, password });
  localStorage.setItem(CLAVE, JSON.stringify(data));
  return data;
}

export function cerrarSesion() {
  localStorage.removeItem(CLAVE);
}

api.interceptors.request.use((config) => {
  const s = sesion();
  if (s?.accessToken) config.headers.Authorization = `Bearer ${s.accessToken}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401 && sesion()) {
      cerrarSesion();
      window.location.assign("/login");
    }
    return Promise.reject(error);
  }
);

export function mensajeError(error) {
  if (!error.response) return "No hay conexión con el servidor. ¿Está corriendo la API?";
  return error.response.data?.message || "Ocurrió un error inesperado";
}
