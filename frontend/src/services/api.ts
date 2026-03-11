import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export const adminAPI = {
  login: (username: string, password: string) =>
    api.post('/admin/login', { username, password }),
  
  logout: () =>
    api.post('/admin/logout'),
  
  getProfile: () =>
    api.get('/admin/profile'),
  
  createSession: (name: string, maxParticipants: number) =>
    api.post('/admin/sessions', { name, maxParticipants }),
  
  getSessions: () =>
    api.get('/admin/sessions'),
  
  getSession: (id: number) =>
    api.get(`/admin/sessions/${id}`),
  
  getLobby: (id: number) =>
    api.get(`/admin/sessions/${id}/lobby`),
  
  startSession: (id: number) =>
    api.patch(`/admin/sessions/${id}/start`),
};

export const participantAPI = {
  joinSession: (roomCode: string, firstName: string, lastName: string) =>
    api.post('/api/join', { roomCode, firstName, lastName }),
  
  getSessionInfo: (roomCode: string) =>
    api.get(`/api/session/${roomCode}`),
};

export default api;
