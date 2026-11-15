import { cn } from '../../lib/utils'

/**
 * Decorative mosque skyline used as a background accent on welcome banners.
 * Purely presentational and hidden from assistive technology.
 */
export function MosqueIllustration({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 420 220"
      fill="none"
      className={cn('pointer-events-none select-none', className)}
    >
      {/* Soft silhouette ---------------------------------------------------- */}
      <g fill="currentColor" opacity="0.72">
        {/* Ground platform */}
        <rect x="40" y="198" width="340" height="8" rx="4" />
        {/* Side halls */}
        <rect x="58" y="172" width="74" height="28" rx="4" />
        <path d="M56 174a38 27 0 0 1 76 0Z" />
        <rect x="288" y="172" width="74" height="28" rx="4" />
        <path d="M286 174a38 27 0 0 1 76 0Z" />
        {/* Minarets */}
        <rect x="110" y="96" width="20" height="104" rx="4" />
        <path d="M110 98a10 13 0 0 1 20 0Z" />
        <rect x="118" y="74" width="4" height="16" rx="2" />
        <circle cx="120" cy="70" r="3.5" />
        <rect x="290" y="96" width="20" height="104" rx="4" />
        <path d="M290 98a10 13 0 0 1 20 0Z" />
        <rect x="298" y="74" width="4" height="16" rx="2" />
        <circle cx="300" cy="70" r="3.5" />
        {/* Prayer hall and central dome */}
        <rect x="148" y="148" width="124" height="52" rx="6" />
        <path d="M146 150a64 60 0 0 1 128 0Z" />
        <rect x="186" y="140" width="48" height="12" rx="3" />
        {/* Finial */}
        <rect x="208" y="74" width="4" height="22" rx="2" />
        <path d="M216 50a13 13 0 1 0 0 26 10 10 0 1 1 0-26Z" />
      </g>

      {/* Architectural detail ---------------------------------------------- */}
      <g stroke="currentColor" strokeWidth="2.4" fill="none" opacity="0.4" strokeLinecap="round">
        {/* Central arched entrance */}
        <path d="M196 200v-24a14 14 0 0 1 28 0v24" />
        {/* Hall windows */}
        <path d="M164 200v-15a8 8 0 0 1 16 0v15" />
        <path d="M240 200v-15a8 8 0 0 1 16 0v15" />
        {/* Dome ribs */}
        <path d="M178 148c6-22 18-36 32-42" />
        <path d="M242 148c-6-22-18-36-32-42" />
        <path d="M210 106v42" />
        {/* Minaret openings */}
        <path d="M116 122h8" />
        <path d="M116 150h8" />
        <path d="M296 122h8" />
        <path d="M296 150h8" />
        {/* Side hall arches */}
        <path d="M82 200v-12a12 12 0 0 1 24 0v12" />
        <path d="M312 200v-12a12 12 0 0 1 24 0v12" />
      </g>
    </svg>
  )
}

export function StarPattern({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 120"
      fill="none"
      className={cn('pointer-events-none select-none', className)}
    >
      <g stroke="currentColor" strokeWidth="1.4" opacity="0.35">
        <path d="M60 8 70 34l27 2-21 17 7 26-23-14-23 14 7-26L23 36l27-2 10-26Z" />
        <circle cx="60" cy="60" r="52" strokeDasharray="3 6" />
      </g>
    </svg>
  )
}

export function BotanicalLeaves({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 200 80"
      fill="none"
      className={cn('pointer-events-none select-none', className)}
    >
      <g opacity="0.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 70 Q 50 40 100 50 T 190 30" />
        <path d="M40 52 C 30 35 45 25 55 35 C 65 45 50 55 40 52 Z" fill="currentColor" fillOpacity="0.15" />
        <path d="M75 48 C 70 25 90 20 95 35 C 100 50 85 55 75 48 Z" fill="currentColor" fillOpacity="0.15" />
        <path d="M115 48 C 110 28 130 22 135 38 C 140 52 125 58 115 48 Z" fill="currentColor" fillOpacity="0.15" />
        <path d="M150 40 C 150 18 170 20 172 35 C 175 48 160 52 150 40 Z" fill="currentColor" fillOpacity="0.15" />
      </g>
    </svg>
  )
}

export function MosqueLandscape({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 300 120"
      fill="none"
      className={cn('pointer-events-none select-none', className)}
    >
      <g opacity="0.22" fill="currentColor">
        <path d="M0 120 L0 100 Q 40 95 80 100 Q 120 105 160 98 Q 200 92 240 98 L300 100 L300 120 Z" />
        <path d="M110 98 C 110 70 150 70 150 98 Z" />
        <rect x="127" y="55" width="6" height="43" />
        <ellipse cx="130" cy="50" rx="6" ry="9" />
        <path d="M130 38 L130 42" stroke="currentColor" strokeWidth="2" />
        <rect x="75" y="65" width="10" height="35" rx="3" />
        <ellipse cx="80" cy="60" rx="7" ry="10" />
        <rect x="180" y="70" width="10" height="30" rx="3" />
        <ellipse cx="185" cy="65" rx="6" ry="9" />
      </g>
      <g opacity="0.3" stroke="currentColor" strokeWidth="1.2">
        <path d="M10 115 Q 35 105 60 115" />
        <path d="M220 115 Q 255 105 290 115" />
      </g>
    </svg>
  )
}
