const Logo = () => {
  return (
    <div className="relative flex items-center justify-center">
      <svg
        width="48"
        height="48"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="animate-glow-pulse"
      >
        {/* Left speech bubble */}
        <path
          d="M8 12C8 9.79086 9.79086 8 12 8H20C22.2091 8 24 9.79086 24 12V20C24 22.2091 22.2091 24 20 24H14L8 28V12Z"
          fill="hsl(var(--primary))"
          className="drop-shadow-[0_0_8px_hsl(var(--glow))]"
        />
        
        {/* Right speech bubble */}
        <path
          d="M40 28C40 30.2091 38.2091 32 36 32H28C25.7909 32 24 30.2091 24 28V20C24 17.7909 25.7909 16 28 16H34L40 12V28Z"
          fill="hsl(var(--glow-secondary))"
          className="drop-shadow-[0_0_8px_hsl(var(--glow-secondary))]"
        />
        
        {/* Keyhole in center */}
        <circle
          cx="24"
          cy="20"
          r="4"
          fill="hsl(var(--background))"
          stroke="hsl(var(--cipher))"
          strokeWidth="1.5"
        />
        <path
          d="M23 24L23 28C23 28.5523 23.4477 29 24 29C24.5523 29 25 28.5523 25 28L25 24"
          stroke="hsl(var(--cipher))"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

export default Logo;
