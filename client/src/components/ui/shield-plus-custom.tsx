interface ShieldPlusCustomProps {
  className?: string;
  style?: React.CSSProperties;
  onLoad?: () => void;
  onError?: () => void;
}

export function ShieldPlusCustom({ className, style, onLoad, onError }: ShieldPlusCustomProps) {
  return (
    <svg 
      className={className}
      style={style}
      onLoad={onLoad}
      onError={onError}
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      {/* Shield outline */}
      <path d="M20 13c0 5-3.5 7.5-8 12.5a1 1 0 0 1-2 0C5.5 20.5 2 18 2 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.5-2.5a1 1 0 0 1 1 0C12.5 3.8 15 5 17 5a1 1 0 0 1 1 1z"/>
      
      {/* Smaller plus symbol - reduced from 4 units to 3 units */}
      <path d="M12 9.5v3" strokeWidth="1"/>
      <path d="M10.5 11h3" strokeWidth="1"/>
    </svg>
  );
}