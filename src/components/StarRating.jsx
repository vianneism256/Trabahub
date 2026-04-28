import React, { useState } from 'react'

export default function StarRating({ value = 0, onChange = null, size = 24 }) {
  const [hovered, setHovered] = useState(0)
  const isInteractive = !!onChange

  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          onClick={() => isInteractive && onChange(star)}
          onMouseEnter={() => isInteractive && setHovered(star)}
          onMouseLeave={() => isInteractive && setHovered(0)}
          style={{
            fontSize: size,
            cursor: isInteractive ? 'pointer' : 'default',
            color: star <= (hovered || value) ? '#f59e0b' : 'var(--gray-300)',
            transition: 'color 0.1s',
            userSelect: 'none',
          }}
        >
          ★
        </span>
      ))}
    </div>
  )
}