const API_URL = 'http://127.0.0.1:8787/api';

export const api = {
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('jwt');
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      return data;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  },

  async login(email, password) {
    return this.request('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async register(name, email, password) {
    return this.request('/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  },

  async getMe() {
    return this.request('/me');
  },

  async getGames() {
    return this.request('/games');
  },

  async addGame(gameData) {
    return this.request('/games', {
      method: 'POST',
      body: JSON.stringify(gameData),
    });
  },

  async deleteGame(id) {
    return this.request(`/games/${id}`, {
      method: 'DELETE',
    });
  },
  
  async getUsers() {
     return this.request('/admin/users');
  },
  
  async toggleUserActive(id, isActive) {
     return this.request(`/admin/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: isActive })
     });
  }
};
