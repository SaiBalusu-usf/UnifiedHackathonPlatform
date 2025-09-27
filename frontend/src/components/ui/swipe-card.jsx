import { useState, useRef, useEffect } from 'react'
import { motion, useMotionValue, useTransform, useAnimation } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'

const SwipeCard = ({ 
  children, 
  onSwipeLeft, 
  onSwipeRight, 
  onSwipeUp,
  className = '',
  disabled = false,
  threshold = 100
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [dragDirection, setDragDirection] = useState(null)
  const cardRef = useRef(null)
  const controls = useAnimation()
  
  // Motion values for drag
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  
  // Transform values for visual feedback
  const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15])
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 0.8, 1, 0.8, 0.5])
  const scale = useTransform(x, [-200, 0, 200], [0.95, 1, 0.95])
  
  // Color overlays for swipe feedback
  const leftOverlayOpacity = useTransform(x, [-200, -50, 0], [1, 0.3, 0])
  const rightOverlayOpacity = useTransform(x, [0, 50, 200], [0, 0.3, 1])
  const upOverlayOpacity = useTransform(y, [-200, -50, 0], [1, 0.3, 0])

  const handleDragStart = () => {
    if (disabled) return
    setIsDragging(true)
  }

  const handleDrag = (event, info) => {
    if (disabled) return
    
    const { offset } = info
    const absX = Math.abs(offset.x)
    const absY = Math.abs(offset.y)
    
    // Determine primary drag direction
    if (absX > absY) {
      setDragDirection(offset.x > 0 ? 'right' : 'left')
    } else {
      setDragDirection(offset.y < 0 ? 'up' : 'down')
    }
  }

  const handleDragEnd = (event, info) => {
    if (disabled) return
    
    setIsDragging(false)
    setDragDirection(null)
    
    const { offset, velocity } = info
    const swipeThreshold = threshold
    const swipeVelocityThreshold = 500
    
    const shouldSwipeLeft = offset.x < -swipeThreshold || velocity.x < -swipeVelocityThreshold
    const shouldSwipeRight = offset.x > swipeThreshold || velocity.x > swipeVelocityThreshold
    const shouldSwipeUp = offset.y < -swipeThreshold || velocity.y < -swipeVelocityThreshold
    
    if (shouldSwipeLeft && onSwipeLeft) {
      // Animate card off screen to the left
      controls.start({
        x: -window.innerWidth,
        opacity: 0,
        transition: { duration: 0.3 }
      }).then(() => {
        onSwipeLeft()
        // Reset position
        controls.set({ x: 0, y: 0, opacity: 1 })
      })
    } else if (shouldSwipeRight && onSwipeRight) {
      // Animate card off screen to the right
      controls.start({
        x: window.innerWidth,
        opacity: 0,
        transition: { duration: 0.3 }
      }).then(() => {
        onSwipeRight()
        // Reset position
        controls.set({ x: 0, y: 0, opacity: 1 })
      })
    } else if (shouldSwipeUp && onSwipeUp) {
      // Animate card off screen upward
      controls.start({
        y: -window.innerHeight,
        opacity: 0,
        transition: { duration: 0.3 }
      }).then(() => {
        onSwipeUp()
        // Reset position
        controls.set({ x: 0, y: 0, opacity: 1 })
      })
    } else {
      // Snap back to center
      controls.start({
        x: 0,
        y: 0,
        transition: { type: 'spring', stiffness: 300, damping: 30 }
      })
    }
  }

  // Programmatic swipe functions
  const swipeLeft = () => {
    if (disabled || !onSwipeLeft) return
    controls.start({
      x: -window.innerWidth,
      opacity: 0,
      transition: { duration: 0.3 }
    }).then(() => {
      onSwipeLeft()
      controls.set({ x: 0, y: 0, opacity: 1 })
    })
  }

  const swipeRight = () => {
    if (disabled || !onSwipeRight) return
    controls.start({
      x: window.innerWidth,
      opacity: 0,
      transition: { duration: 0.3 }
    }).then(() => {
      onSwipeRight()
      controls.set({ x: 0, y: 0, opacity: 1 })
    })
  }

  const swipeUp = () => {
    if (disabled || !onSwipeUp) return
    controls.start({
      y: -window.innerHeight,
      opacity: 0,
      transition: { duration: 0.3 }
    }).then(() => {
      onSwipeUp()
      controls.set({ x: 0, y: 0, opacity: 1 })
    })
  }

  // Expose swipe functions to parent
  useEffect(() => {
    if (cardRef.current) {
      cardRef.current.swipeLeft = swipeLeft
      cardRef.current.swipeRight = swipeRight
      cardRef.current.swipeUp = swipeUp
    }
  }, [])

  return (
    <motion.div
      ref={cardRef}
      className={`relative select-none ${className}`}
      style={{ x, y, rotate, opacity, scale }}
      animate={controls}
      drag={!disabled}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.2}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
    >
      <Card className={`overflow-hidden ${disabled ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}`}>
        {children}
        
        {/* Swipe feedback overlays */}
        {!disabled && (
          <>
            {/* Left swipe (reject) overlay */}
            <motion.div
              className="absolute inset-0 bg-red-500/20 flex items-center justify-center"
              style={{ opacity: leftOverlayOpacity }}
              initial={{ opacity: 0 }}
            >
              <div className="bg-red-500 text-white px-4 py-2 rounded-full font-bold text-lg transform -rotate-12">
                PASS
              </div>
            </motion.div>

            {/* Right swipe (like) overlay */}
            <motion.div
              className="absolute inset-0 bg-green-500/20 flex items-center justify-center"
              style={{ opacity: rightOverlayOpacity }}
              initial={{ opacity: 0 }}
            >
              <div className="bg-green-500 text-white px-4 py-2 rounded-full font-bold text-lg transform rotate-12">
                MATCH
              </div>
            </motion.div>

            {/* Up swipe (super like) overlay */}
            <motion.div
              className="absolute inset-0 bg-blue-500/20 flex items-center justify-center"
              style={{ opacity: upOverlayOpacity }}
              initial={{ opacity: 0 }}
            >
              <div className="bg-blue-500 text-white px-4 py-2 rounded-full font-bold text-lg">
                SUPER MATCH
              </div>
            </motion.div>
          </>
        )}
      </Card>

      {/* Drag direction indicator */}
      {isDragging && dragDirection && (
        <motion.div
          className="absolute -top-8 left-1/2 transform -translate-x-1/2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
        >
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            dragDirection === 'left' ? 'bg-red-100 text-red-700' :
            dragDirection === 'right' ? 'bg-green-100 text-green-700' :
            dragDirection === 'up' ? 'bg-blue-100 text-blue-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {dragDirection === 'left' ? '← Pass' :
             dragDirection === 'right' ? 'Match →' :
             dragDirection === 'up' ? '↑ Super Match' :
             '↓ Info'}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

export default SwipeCard

