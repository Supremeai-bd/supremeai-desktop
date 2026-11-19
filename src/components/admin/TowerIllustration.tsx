export default function TowerIllustration({ className = 'w-full h-auto' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 580 220" fill="none" aria-hidden="true">
      <defs>
        <linearGradient
          id="tower-line"
          x1="235"
          y1="20"
          x2="411"
          y2="192"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#dcffad" />
          <stop offset="1" stopColor="#6eb358" />
        </linearGradient>
        <linearGradient
          id="tower-deck"
          x1="320"
          y1="72"
          x2="340"
          y2="162"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#315539" />
          <stop offset="1" stopColor="#182c22" />
        </linearGradient>
        <radialGradient
          id="tower-glow"
          cx="0"
          cy="0"
          r="1"
          gradientTransform="translate(347 115) scale(260 130)"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#6ca14d" stopOpacity=".27" />
          <stop offset="1" stopColor="#568847" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="grid-fade">
          <stop stopColor="white" />
          <stop offset=".65" stopColor="white" stopOpacity=".75" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id="tower-grid-mask">
          <ellipse cx="332" cy="127" rx="263" ry="135" fill="url(#grid-fade)" />
        </mask>
        <pattern
          id="isometric-grid"
          width="25"
          height="25"
          patternUnits="userSpaceOnUse"
          patternTransform="matrix(1 .42 -1 .42 5 0)"
        >
          <path d="M25 0H0v25" stroke="#95bb83" strokeWidth=".75" strokeOpacity=".43" />
        </pattern>
        <filter id="tower-halo" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      <path fill="url(#tower-glow)" d="M0 0h580v220H0z" />
      <g mask="url(#tower-grid-mask)">
        <path fill="url(#isometric-grid)" d="M0 0h580v220H0z" />
        <path
          d="m110 140 215-89 222 91-224 93Z"
          stroke="#6c955f"
          strokeOpacity=".25"
          strokeDasharray="3 6"
        />
        <path d="m166 153 163-68 172 71-168 69Z" stroke="#8bc378" strokeOpacity=".28" />
        <path
          d="m120 105 46-19 32 13m249 85 39-16 42 17M195 197l40 17 21-9m222-142 20 8 32-13"
          stroke="#91c37e"
          strokeOpacity=".42"
        />
      </g>

      <g stroke="#84ab77" strokeWidth="1" opacity=".32">
        <path d="M106 50v-5h5m408 0h5v5M106 181v5h5m408 0h5v-5" />
        <path d="M150 72h8m-4-4v8m349 56h8m-4-4v8M251 29h8m-4-4v8m162 165h8m-4-4v8" />
      </g>

      <g stroke="#9ccc88" strokeOpacity=".68" strokeWidth="1" strokeLinejoin="round">
        <path
          d="m161 113 40 17 44-18M441 108l42-17-26-11m-49 76 36 15 39-16m-281 19 33-14 27 11"
          strokeDasharray="2 4"
        />
        <path
          d="m144 112 17-7 17 7-17 7zM464 79l15-6 15 6-15 6zM469 155l15-6 15 6-15 6zM186 175l16-7 16 7-16 7z"
          fill="#1e3729"
        />
        <path d="m144 112 17 7 17-7m-17 7v5m303-45 15 6 15-6m-15 6v5m-10 65 15 6 15-6m-15 6v5m-298 9 16 7 16-7m-16 7v5" />
      </g>

      <g opacity=".85">
        <ellipse
          cx="332"
          cy="127"
          rx="148"
          ry="76"
          stroke="#94cb83"
          strokeOpacity=".35"
          strokeDasharray="5 7"
        />
        <ellipse cx="332" cy="127" rx="98" ry="50" stroke="#b2f392" strokeOpacity=".5" />
      </g>

      <g filter="url(#tower-halo)" opacity=".6">
        <circle cx="332" cy="46" r="4" fill="#d9ffb0" />
        <path d="m332 46-78 68m78-68 84 68m-84-68v102" stroke="#dcffad" strokeWidth="2" />
      </g>

      <path
        d="m332 38-84 76 84 46 84-46-84-76Z"
        stroke="url(#tower-line)"
        strokeWidth="1.8"
        fill="url(#tower-deck)"
        fillOpacity=".3"
      />
      <path
        d="m332 38 84 76-84 46-84-46 84-76Z"
        stroke="#87c075"
        strokeOpacity=".35"
        strokeWidth="1"
      />
      <path d="M332 16v22m0 122v42" stroke="#d5ffa6" strokeWidth="2" strokeLinecap="round" />
      <circle cx="332" cy="16" r="4.5" fill="#f1ffdc" />
      <circle cx="332" cy="16" r="12" stroke="#c9ff96" strokeOpacity=".5" strokeWidth="1.2" />
      <circle
        cx="332"
        cy="16"
        r="21"
        stroke="#a4eb7a"
        strokeOpacity=".25"
        strokeWidth="1"
        strokeDasharray="2 4"
      />

      <g stroke="#9fd98b" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="m278 114 54 29 54-29-54-30-54 30Z" fill="#14261d" fillOpacity=".8" />
        <path d="m332 143v24m-54-53v24l54 29m54-53v24l-54 29" />
        <path d="m302 98 30 16 30-16-30-17-30 17Z" fill="#203d2b" />
        <path d="m332 114v16m-30-30v16l30 14m30-30v16l-30 14" stroke="#c8ff9c" />
      </g>

      <g fill="#e3ffbd">
        <circle cx="248" cy="114" r="3" />
        <circle cx="416" cy="114" r="3" />
        <circle cx="332" cy="160" r="3.5" />
        <circle cx="332" cy="84" r="3" />
      </g>
    </svg>
  );
}
