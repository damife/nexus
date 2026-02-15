import React from 'react'

// Line Chart Component
export const LineChart = ({ data, labels, color = '#3B82F6', height = 300 }) => {
  const maxValue = Math.max(...data) * 1.1
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100
    const y = 100 - (value / maxValue) * 100
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="relative" style={{ height: `${height}px` }}>
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Grid Lines */}
        {[0, 25, 50, 75, 100].map((y, index) => (
          <line
            key={index}
            x1="0"
            y1={y}
            x2="100"
            y2={y}
            stroke="#E5E7EB"
            strokeWidth="0.5"
          />
        ))}
        
        {/* Data Line */}
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Area Fill */}
        <polygon
          points={`${points}, 100,100 0,100`}
          fill={color}
          fillOpacity="0.1"
        />
        
        {/* Data Points */}
        {data.map((value, index) => {
          const x = (index / (data.length - 1)) * 100
          const y = 100 - (value / maxValue) * 100
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="1.5"
              fill={color}
              className="hover:r-2 transition-all"
            />
          )
        })}
      </svg>
      
      {/* Labels */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500 font-mono px-2">
        {labels.map((label, index) => (
          <span key={index}>{label}</span>
        ))}
      </div>
    </div>
  )
}

// Bar Chart Component
export const BarChart = ({ data, labels, colors = ['#3B82F6'], height = 300 }) => {
  const maxValue = Math.max(...data) * 1.1
  const barWidth = 80 / data.length

  return (
    <div className="relative" style={{ height: `${height}px` }}>
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Grid Lines */}
        {[0, 25, 50, 75, 100].map((y, index) => (
          <line
            key={index}
            x1="0"
            y1={y}
            x2="100"
            y2={y}
            stroke="#E5E7EB"
            strokeWidth="0.5"
          />
        ))}
        
        {/* Bars */}
        {data.map((value, index) => {
          const barHeight = (value / maxValue) * 100
          const x = 10 + (index * barWidth)
          const color = colors[index % colors.length]
          
          return (
            <rect
              key={index}
              x={x}
              y={100 - barHeight}
              width={barWidth * 0.8}
              height={barHeight}
              fill={color}
              rx="1"
              className="hover:opacity-80 transition-opacity"
            />
          )
        })}
      </svg>
      
      {/* Labels */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-around text-xs text-gray-500 font-mono px-2">
        {labels.map((label, index) => (
          <span key={index} className="text-center">{label}</span>
        ))}
      </div>
    </div>
  )
}

// Pie Chart Component
export const PieChart = ({ data, labels, colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'], height = 300 }) => {
  const total = data.reduce((sum, value) => sum + value, 0)
  let currentAngle = 0
  
  const segments = data.map((value, index) => {
    const percentage = (value / total) * 100
    const angle = (value / total) * 360
    const startAngle = currentAngle
    const endAngle = currentAngle + angle
    currentAngle = endAngle
    
    const startAngleRad = (startAngle * Math.PI) / 180
    const endAngleRad = (endAngle * Math.PI) / 180
    
    const x1 = 50 + 40 * Math.cos(startAngleRad)
    const y1 = 50 + 40 * Math.sin(startAngleRad)
    const x2 = 50 + 40 * Math.cos(endAngleRad)
    const y2 = 50 + 40 * Math.sin(endAngleRad)
    
    const largeArcFlag = angle > 180 ? 1 : 0
    
    return {
      path: `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`,
      color: colors[index % colors.length],
      percentage,
      label: labels[index],
      value
    }
  })

  return (
    <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
      <div className="flex items-center gap-8">
        {/* Pie Chart */}
        <svg className="w-40 h-40" viewBox="0 0 100 100">
          {segments.map((segment, index) => (
            <path
              key={index}
              d={segment.path}
              fill={segment.color}
              className="hover:opacity-80 transition-opacity cursor-pointer"
            />
          ))}
        </svg>
        
        {/* Legend */}
        <div className="space-y-2">
          {segments.map((segment, index) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: segment.color }}
              ></div>
              <div className="text-sm">
                <span className="font-medium text-gray-900 font-mono">{segment.label}</span>
                <span className="text-gray-500 font-mono ml-2">
                  {segment.percentage.toFixed(1)}% ({segment.value})
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Progress Ring Component
export const ProgressRing = ({ value, max = 100, size = 120, strokeWidth = 8, color = '#3B82F6' }) => {
  const percentage = (value / max) * 100
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <span className="text-2xl font-bold text-gray-900 font-mono">
            {Math.round(percentage)}%
          </span>
          <div className="text-xs text-gray-500 font-mono">
            {value} / {max}
          </div>
        </div>
      </div>
    </div>
  )
}

// Mini Chart Component (for cards)
export const MiniChart = ({ data, type = 'line', color = '#3B82F6', height = 60 }) => {
  if (type === 'line') {
    const maxValue = Math.max(...data) * 1.1
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * 100
      const y = 100 - (value / maxValue) * 100
      return `${x},${y}`
    }).join(' ')

    return (
      <div className="relative" style={{ height: `${height}px` }}>
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polygon
            points={`${points}, 100,100 0,100`}
            fill={color}
            fillOpacity="0.1"
          />
        </svg>
      </div>
    )
  }

  if (type === 'bar') {
    const maxValue = Math.max(...data) * 1.1
    const barWidth = 100 / data.length

    return (
      <div className="relative" style={{ height: `${height}px` }}>
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {data.map((value, index) => {
            const barHeight = (value / maxValue) * 100
            const x = index * barWidth
            return (
              <rect
                key={index}
                x={x}
                y={100 - barHeight}
                width={barWidth * 0.8}
                height={barHeight}
                fill={color}
                rx="0.5"
              />
            )
          })}
        </svg>
      </div>
    )
  }

  return null
}

// Heatmap Component
export const Heatmap = ({ data, days = 7, hours = 24, height = 200 }) => {
  const maxValue = Math.max(...data.flat())
  const cellWidth = 100 / hours
  const cellHeight = 100 / days

  const getColor = (value) => {
    const intensity = value / maxValue
    if (intensity === 0) return '#F3F4F6'
    if (intensity < 0.25) return '#DBEAFE'
    if (intensity < 0.5) return '#93C5FD'
    if (intensity < 0.75) return '#3B82F6'
    return '#1E40AF'
  }

  return (
    <div className="relative" style={{ height: `${height}px` }}>
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {data.map((row, dayIndex) =>
          row.map((value, hourIndex) => (
            <rect
              key={`${dayIndex}-${hourIndex}`}
              x={hourIndex * cellWidth}
              y={dayIndex * cellHeight}
              width={cellWidth}
              height={cellHeight}
              fill={getColor(value)}
              className="hover:stroke-gray-900 hover:stroke-0.5"
            />
          ))
        )}
      </svg>
      
      {/* Day labels */}
      <div className="absolute left-0 top-0 h-full flex flex-col justify-around text-xs text-gray-500 font-mono -ml-8">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].slice(0, days).map((day, index) => (
          <span key={index}>{day}</span>
        ))}
      </div>
      
      {/* Hour labels */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500 font-mono -mb-6">
        {[0, 6, 12, 18].map((hour) => (
          <span key={hour}>{hour}:00</span>
        ))}
      </div>
    </div>
  )
}

// Gauge Chart Component
export const GaugeChart = ({ value, max = 100, thresholds = [], height = 200 }) => {
  const percentage = (value / max) * 100
  const angle = (percentage * 180) / 100 - 90
  
  const getThresholdColor = () => {
    for (const threshold of thresholds) {
      if (percentage <= threshold.value) {
        return threshold.color
      }
    }
    return thresholds[thresholds.length - 1]?.color || '#10B981'
  }

  const color = getThresholdColor()

  return (
    <div className="relative" style={{ height: `${height}px` }}>
      <svg className="w-full h-full" viewBox="0 0 200 120" preserveAspectRatio="xMidYMid meet">
        {/* Background arc */}
        <path
          d="M 30 100 A 70 70 0 0 1 170 100"
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="20"
          strokeLinecap="round"
        />
        
        {/* Colored arc */}
        <path
          d="M 30 100 A 70 70 0 0 1 170 100"
          fill="none"
          stroke={color}
          strokeWidth="20"
          strokeLinecap="round"
          strokeDasharray={`${(percentage / 100) * 219.91} 219.91`}
          className="transition-all duration-500 ease-out"
        />
        
        {/* Needle */}
        <line
          x1="100"
          y1="100"
          x2={100 + 60 * Math.cos((angle * Math.PI) / 180)}
          y2={100 + 60 * Math.sin((angle * Math.PI) / 180)}
          stroke="#374151"
          strokeWidth="3"
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
        
        {/* Center circle */}
        <circle cx="100" cy="100" r="8" fill="#374151" />
      </svg>
      
      {/* Value display */}
      <div className="absolute bottom-0 left-0 right-0 text-center">
        <div className="text-2xl font-bold text-gray-900 font-mono">
          {value}
        </div>
        <div className="text-xs text-gray-500 font-mono">
          of {max}
        </div>
      </div>
    </div>
  )
}

export default {
  LineChart,
  BarChart,
  PieChart,
  ProgressRing,
  MiniChart,
  Heatmap,
  GaugeChart
}
