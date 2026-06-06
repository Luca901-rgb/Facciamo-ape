import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export { BACKEND_URL };
export const API = `${BACKEND_URL}/api`;

const SESSION_KEY = "ape_session";

export function setSessionToken(token) {
  if (token) sessionStorage.setItem(SESSION_KEY, token);
  else sessionStorage.removeItem(SESSION_KEY);
}

export function getSessionToken() {
  return sessionStorage.getItem(SESSION_KEY);
}

/** Persist Bearer token and return user payload without session_token. */
export function applyAuthResponse(data) {
  if (data?.session_token) setSessionToken(data.session_token);
  const { session_token: _token, ...user } = data;
  return user;
}

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
  timeout: 90000,
});

api.interceptors.request.use((config) => {
  const token = getSessionToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === "ECONNABORTED") {
      error.message =
        "Il server impiega troppo tempo (forse si sta avviando). Riprova tra qualche secondo.";
    }
    return Promise.reject(error);
  }
);

export const fileUrl = (path) => (path ? `${API}/files/${path}` : null);

export const wsUrl = (token) => {
  const url = new URL(BACKEND_URL);
  const proto = url.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${url.host}/api/ws/${token}`;
};
