import { createContext, useContext, useState, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

  // Check for existing token on app load
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      validateToken(token)
    } else {
      setLoading(false)
    }
  }, [])

  const validateToken = async (token) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const userData = await response.json()
        setUser(userData.data)
      } else {
        localStorage.removeItem('token')
      }
    } catch (error) {
      console.error('Token validation failed:', error)
      localStorage.removeItem('token')
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (response.ok) {
        const { token, user: userData } = data.data
        localStorage.setItem('token', token)
        setUser(userData)
        
        toast({
          title: 'Welcome back!',
          description: 'You have successfully logged in.',
        })
        
        return { success: true }
      } else {
        toast({
          title: 'Login failed',
          description: data.message || 'Invalid credentials',
          variant: 'destructive'
        })
        return { success: false, error: data.message }
      }
    } catch (error) {
      console.error('Login error:', error)
      toast({
        title: 'Login failed',
        description: 'Network error. Please try again.',
        variant: 'destructive'
      })
      return { success: false, error: 'Network error' }
    } finally {
      setLoading(false)
    }
  }

  const register = async (userData) => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: 'Registration successful!',
          description: 'Please log in with your credentials.',
        })
        return { success: true }
      } else {
        toast({
          title: 'Registration failed',
          description: data.message || 'Please check your information',
          variant: 'destructive'
        })
        return { success: false, error: data.message }
      }
    } catch (error) {
      console.error('Registration error:', error)
      toast({
        title: 'Registration failed',
        description: 'Network error. Please try again.',
        variant: 'destructive'
      })
      return { success: false, error: 'Network error' }
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
    toast({
      title: 'Logged out',
      description: 'You have been successfully logged out.',
    })
  }

  const updateProfile = async (profileData) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE_URL}/users/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
      })

      const data = await response.json()

      if (response.ok) {
        setUser(data.data)
        toast({
          title: 'Profile updated',
          description: 'Your profile has been successfully updated.',
        })
        return { success: true }
      } else {
        toast({
          title: 'Update failed',
          description: data.message || 'Failed to update profile',
          variant: 'destructive'
        })
        return { success: false, error: data.message }
      }
    } catch (error) {
      console.error('Profile update error:', error)
      toast({
        title: 'Update failed',
        description: 'Network error. Please try again.',
        variant: 'destructive'
      })
      return { success: false, error: 'Network error' }
    }
  }

  const uploadResume = async (file) => {
    try {
      const token = localStorage.getItem('token')
      const formData = new FormData()
      formData.append('resume', file)

      const response = await fetch(`${API_BASE_URL}/resumes/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: 'Resume uploaded',
          description: 'Your resume is being processed by our AI system.',
        })
        return { success: true, data: data.data }
      } else {
        toast({
          title: 'Upload failed',
          description: data.message || 'Failed to upload resume',
          variant: 'destructive'
        })
        return { success: false, error: data.message }
      }
    } catch (error) {
      console.error('Resume upload error:', error)
      toast({
        title: 'Upload failed',
        description: 'Network error. Please try again.',
        variant: 'destructive'
      })
      return { success: false, error: 'Network error' }
    }
  }

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token')
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    uploadResume,
    getAuthHeaders,
    API_BASE_URL
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

