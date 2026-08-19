import { defineStore } from 'pinia'
import { getProfile } from '@/api/auth'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    user: null,
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
    userId: (state) => state.user?.id,
  },

  actions: {
    setToken(token) {
      this.token = token
      localStorage.setItem('token', token)
    },

    clearAuth() {
      this.token = ''
      this.user = null
      localStorage.removeItem('token')
    },

    async fetchProfile() {
      try {
        const res = await getProfile()
        this.user = res.data
      } catch {
        this.clearAuth()
      }
    },
  },
})