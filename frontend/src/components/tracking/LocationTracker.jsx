import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { useWebSocket } from '@/contexts/WebSocketContext'
import { useToast } from '@/hooks/use-toast'
import { 
  MapPin, 
  Navigation, 
  Users, 
  Clock, 
  Wifi, 
  WifiOff,
  RefreshCw,
  Settings
} from 'lucide-react'

const LocationTracker = ({ hackathonId }) => {
  const { user } = useAuth()
  const { updateLocation, connected } = useWebSocket()
  const { toast } = useToast()
  
  const [location, setLocation] = useState(null)
  const [isTracking, setIsTracking] = useState(false)
  const [accuracy, setAccuracy] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [nearbyUsers, setNearbyUsers] = useState([])
  const [error, setError] = useState(null)
  const [settings, setSettings] = useState({
    shareLocation: true,
    showNearbyUsers: true,
    updateInterval: 30000, // 30 seconds
    highAccuracy: true
  })
  
  const watchId = useRef(null)
  const updateInterval = useRef(null)

  useEffect(() => {
    if (isTracking && settings.shareLocation) {
      startLocationTracking()
    } else {
      stopLocationTracking()
    }

    return () => {
      stopLocationTracking()
    }
  }, [isTracking, settings.shareLocation, settings.updateInterval, settings.highAccuracy])

  const startLocationTracking = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser')
      return
    }

    const options = {
      enableHighAccuracy: settings.highAccuracy,
      timeout: 10000,
      maximumAge: 60000 // 1 minute
    }

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      handleLocationSuccess,
      handleLocationError,
      options
    )

    // Start watching position
    watchId.current = navigator.geolocation.watchPosition(
      handleLocationSuccess,
      handleLocationError,
      options
    )

    // Set up periodic updates
    updateInterval.current = setInterval(() => {
      if (location && connected && hackathonId) {
        updateLocation(hackathonId, location)
      }
    }, settings.updateInterval)

    toast({
      title: 'Location tracking started',
      description: 'Your location is now being shared with your team',
    })
  }

  const stopLocationTracking = () => {
    if (watchId.current) {
      navigator.geolocation.clearWatch(watchId.current)
      watchId.current = null
    }

    if (updateInterval.current) {
      clearInterval(updateInterval.current)
      updateInterval.current = null
    }

    if (isTracking) {
      toast({
        title: 'Location tracking stopped',
        description: 'Your location is no longer being shared',
      })
    }
  }

  const handleLocationSuccess = (position) => {
    const newLocation = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      timestamp: new Date().toISOString()
    }

    setLocation(newLocation)
    setAccuracy(position.coords.accuracy)
    setLastUpdate(new Date())
    setError(null)

    // Send location update via WebSocket
    if (connected && hackathonId && settings.shareLocation) {
      updateLocation(hackathonId, newLocation)
    }

    // Fetch nearby users (mock implementation)
    fetchNearbyUsers(newLocation)
  }

  const handleLocationError = (error) => {
    let errorMessage = 'Unknown location error'
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Location access denied by user'
        break
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Location information unavailable'
        break
      case error.TIMEOUT:
        errorMessage = 'Location request timed out'
        break
    }

    setError(errorMessage)
    setIsTracking(false)
    
    toast({
      title: 'Location error',
      description: errorMessage,
      variant: 'destructive'
    })
  }

  const fetchNearbyUsers = async (currentLocation) => {
    if (!settings.showNearbyUsers) return

    try {
      // Mock nearby users data
      const mockNearbyUsers = [
        {
          id: 1,
          name: 'Alice Johnson',
          avatar: null,
          distance: 0.1, // km
          lastSeen: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
          status: 'online',
          team: 'AI Innovators'
        },
        {
          id: 2,
          name: 'Bob Smith',
          avatar: null,
          distance: 0.3,
          lastSeen: new Date(Date.now() - 15 * 60 * 1000),
          status: 'online',
          team: 'Frontend Masters'
        },
        {
          id: 3,
          name: 'Carol Davis',
          avatar: null,
          distance: 0.5,
          lastSeen: new Date(Date.now() - 2 * 60 * 1000),
          status: 'away',
          team: 'AI Innovators'
        }
      ]

      setNearbyUsers(mockNearbyUsers)
    } catch (error) {
      console.error('Failed to fetch nearby users:', error)
    }
  }

  const toggleTracking = () => {
    setIsTracking(!isTracking)
  }

  const refreshLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        handleLocationSuccess,
        handleLocationError,
        {
          enableHighAccuracy: settings.highAccuracy,
          timeout: 10000,
          maximumAge: 0 // Force fresh location
        }
      )
    }
  }

  const formatDistance = (distance) => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`
    }
    return `${distance.toFixed(1)}km`
  }

  const formatLastUpdate = (date) => {
    if (!date) return 'Never'
    
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / (1000 * 60))
    const seconds = Math.floor(diff / 1000)
    
    if (minutes > 0) return `${minutes}m ago`
    return `${seconds}s ago`
  }

  return (
    <div className="space-y-6">
      {/* Location Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MapPin className="w-5 h-5" />
              <span>Location Tracking</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={connected ? 'default' : 'secondary'}>
                {connected ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
                {connected ? 'Connected' : 'Offline'}
              </Badge>
              <Switch
                checked={isTracking}
                onCheckedChange={toggleTracking}
                disabled={!connected}
              />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {location && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Coordinates</Label>
                <p className="text-sm font-mono">
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Accuracy</Label>
                <p className="text-sm">
                  {accuracy ? `±${Math.round(accuracy)}m` : 'Unknown'}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Last Update</Label>
                <p className="text-sm">{formatLastUpdate(lastUpdate)}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                <p className="text-sm">
                  {isTracking ? (
                    <Badge variant="default" className="text-xs">
                      <Navigation className="w-3 h-3 mr-1" />
                      Tracking
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      Stopped
                    </Badge>
                  )}
                </p>
              </div>
            </div>
          )}

          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshLocation}
              disabled={!navigator.geolocation}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Location Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="share-location">Share Location</Label>
              <p className="text-xs text-muted-foreground">
                Allow team members to see your location
              </p>
            </div>
            <Switch
              id="share-location"
              checked={settings.shareLocation}
              onCheckedChange={(checked) => 
                setSettings({...settings, shareLocation: checked})
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="show-nearby">Show Nearby Users</Label>
              <p className="text-xs text-muted-foreground">
                Display other participants near your location
              </p>
            </div>
            <Switch
              id="show-nearby"
              checked={settings.showNearbyUsers}
              onCheckedChange={(checked) => 
                setSettings({...settings, showNearbyUsers: checked})
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="high-accuracy">High Accuracy</Label>
              <p className="text-xs text-muted-foreground">
                Use GPS for more precise location (uses more battery)
              </p>
            </div>
            <Switch
              id="high-accuracy"
              checked={settings.highAccuracy}
              onCheckedChange={(checked) => 
                setSettings({...settings, highAccuracy: checked})
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Nearby Users Card */}
      {settings.showNearbyUsers && nearbyUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Nearby Participants</span>
              <Badge variant="secondary">{nearbyUsers.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {nearbyUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium">
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.team}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-2">
                      <Badge variant={user.status === 'online' ? 'default' : 'secondary'} className="text-xs">
                        {user.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatDistance(user.distance)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {formatLastUpdate(user.lastSeen)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default LocationTracker

