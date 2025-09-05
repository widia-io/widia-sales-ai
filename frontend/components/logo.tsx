interface LogoProps {
  className?: string
  showText?: boolean
  variant?: 'default' | 'white'
}

export function Logo({ className = "", showText = true, variant = 'default' }: LogoProps) {
  const isWhite = variant === 'white'
  const textColor = isWhite ? 'text-white' : 'text-black'
  const bgColor = isWhite ? 'bg-white' : 'bg-black'
  const strokeColor = isWhite ? 'black' : 'white'
  
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* W widia.io */}
      <div className="flex items-center gap-2">
        <div className={`w-10 h-10 ${bgColor} rounded-lg flex items-center justify-center`}>
          <svg
            width="40"
            height="40"
            viewBox="0 0 40 40"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M10 12L14 28L20 16L26 28L30 12"
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </div>
        {showText && (
          <div className="flex items-baseline">
            <span className={`text-2xl font-bold ${textColor}`}>widia</span>
            <span className={`text-2xl font-normal ${textColor}`}>.io</span>
          </div>
        )}
      </div>

      {/* Separator */}
      {showText && (
        <span className={`text-2xl ${isWhite ? 'text-gray-600' : 'text-gray-300'}`}>|</span>
      )}

      {/* widia connect */}
      {showText && (
        <div className="flex items-baseline">
          <span className={`text-2xl font-bold ${textColor}`}>widia</span>
          <span className={`text-2xl font-normal ${textColor} ml-1`}>connect</span>
        </div>
      )}
    </div>
  )
}