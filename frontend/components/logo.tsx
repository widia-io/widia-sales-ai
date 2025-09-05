interface LogoProps {
  className?: string
  showText?: boolean
}

export function Logo({ className = "", showText = true }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* W widia.io */}
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
          <svg
            width="40"
            height="40"
            viewBox="0 0 40 40"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M10 12L14 28L20 16L26 28L30 12"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </div>
        {showText && (
          <div className="flex items-baseline">
            <span className="text-2xl font-bold text-black">widia</span>
            <span className="text-2xl font-normal text-black">.io</span>
          </div>
        )}
      </div>

      {/* Separator */}
      {showText && (
        <span className="text-2xl text-gray-300">|</span>
      )}

      {/* widia connect */}
      {showText && (
        <div className="flex items-baseline">
          <span className="text-2xl font-bold text-black">widia</span>
          <span className="text-2xl font-normal text-black ml-1">connect</span>
        </div>
      )}
    </div>
  )
}