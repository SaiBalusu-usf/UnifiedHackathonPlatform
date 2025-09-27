import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'
import { useToast } from '@/hooks/use-toast'

const WebSocketContext = createContext({})

export const useWebSocket = () => {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
}

export const WebSocketProvider = ({ children }) => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState([])
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5

  const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000'

  useEffect(() => {
    if (user) {
      connectSocket()
    } else {
      disconnectSocket()
    }

    return () => {
      disconnectSocket()
    }
  }, [user])

  const connectSocket = () => {
    if (socket) return

    const token = localStorage.getItem('token')
    if (!token) return

    console.log('Connecting to WebSocket server...')
    
    const newSocket = io(WS_URL, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling']
    })

    newSocket.on('connect', () => {
      console.log('Connected to WebSocket server')
      setConnected(true)
      reconnectAttempts.current = 0
      
      toast({
        title: 'Connected',
        description: 'Real-time features are now active.',
      })
    })

    newSocket.on('disconnect', (reason) => {
      console.log('Disconnected from WebSocket server:', reason)
      setConnected(false)
      
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        handleReconnect()
      }
    })

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error)
      setConnected(false)
      handleReconnect()
    })

    // Team-related events
    newSocket.on('team-created', (data) => {
      toast({
        title: 'New Team Created',
        description: `A new team has been created in your hackathon.`,
      })
    })

    newSocket.on('member-added', (data) => {
      toast({
        title: 'Team Member Added',
        description: `A new member has joined your team.`,
      })
    })

    newSocket.on('member-removed', (data) => {
      toast({
        title: 'Team Member Left',
        description: `A member has left your team.`,
      })
    })

    // Tracking events
    newSocket.on('user-checked-in', (data) => {
      console.log('User checked in:', data)
    })

    newSocket.on('tracking-update', (data) => {
      console.log('Tracking update:', data)
    })

    newSocket.on('user-location-update', (data) => {
      console.log('User location update:', data)
    })

    // Resume events
    newSocket.on('resume-parsed', (data) => {
      toast({
        title: 'Resume Processed',
        description: 'Your resume has been successfully analyzed by our AI system.',
      })
    })

    // Notification events
    newSocket.on('notification', (data) => {
      toast({
        title: data.title || 'Notification',
        description: data.message,
      })
    })

    // Hackathon events
    newSocket.on('hackathon-started', (data) => {
      toast({
        title: 'Hackathon Started!',
        description: 'The hackathon has officially begun. Good luck!',
      })
    })

    newSocket.on('hackathon-ended', (data) => {
      toast({
        title: 'Hackathon Ended',
        description: 'The hackathon has concluded. Thanks for participating!',
      })
    })

    // Typing indicators
    newSocket.on('user-typing', (data) => {
      console.log('User typing:', data)
    })

    setSocket(newSocket)
  }

  const handleReconnect = () => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      toast({
        title: 'Connection Failed',
        description: 'Unable to connect to real-time services. Please refresh the page.',
        variant: 'destructive'
      })
      return
    }

    reconnectAttempts.current++
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000)
    
    setTimeout(() => {
      if (!connected && user) {
        console.log(`Reconnection attempt ${reconnectAttempts.current}...`)
        disconnectSocket()
        connectSocket()
      }
    }, delay)
  }

  const disconnectSocket = () => {
    if (socket) {
      socket.disconnect()
      setSocket(null)
      setConnected(false)
    }
  }

  // Utility functions for sending events
  const joinHackathon = (hackathonId) => {
    if (socket && connected) {
      socket.emit('join-hackathon', hackathonId)
    }
  }

  const leaveHackathon = (hackathonId) => {
    if (socket && connected) {
      socket.emit('leave-hackathon', hackathonId)
    }
  }

  const joinTeam = (teamId) => {
    if (socket && connected) {
      socket.emit('join-team', teamId)
    }
  }

  const leaveTeam = (teamId) => {
    if (socket && connected) {
      socket.emit('leave-team', teamId)
    }
  }

  const updateLocation = (hackathonId, location) => {
    if (socket && connected) {
      socket.emit('location-update', { hackathonId, location })
    }
  }

  const startTyping = (teamId) => {
    if (socket && connected) {
      socket.emit('typing-start', teamId)
    }
  }

  const stopTyping = (teamId) => {
    if (socket && connected) {
      socket.emit('typing-stop', teamId)
    }
  }

  const value = {
    socket,
    connected,
    onlineUsers,
    joinHackathon,
    leaveHackathon,
    joinTeam,
    leaveTeam,
    updateLocation,
    startTyping,
    stopTyping
  }

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  )
}

