import React from 'react';

export const SignLanguageMascot: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <svg 
      viewBox="0 0 500 500" 
      className={className} 
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
    >
      {/* Background Decorative Circle & Lines */}
      <circle cx="250" cy="280" r="180" fill="#a1ced5" opacity="0.6" stroke="none" />
      <path d="M 50 300 Q 150 250 250 350 T 450 250" stroke="#fcfcfc" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
      <path d="M 100 350 Q 200 300 300 400 T 450 320" stroke="#fcfcfc" strokeWidth="4" strokeLinecap="round" opacity="0.8" />

      {/* Main Character Group */}
      <g stroke="#263238" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round">
        
        {/* Right Arm (Back) */}
        <path d="M 330 350 C 350 330 380 280 360 210" fill="none" stroke="#9dc074" strokeWidth="40" />
        <path d="M 330 350 C 350 330 380 280 360 210" fill="none" />
        {/* Sleeve Roll Right */}
        <path d="M 340 210 L 380 200 L 385 220 L 345 230 Z" fill="#9dc074" />
        {/* Right Forearm */}
        <path d="M 360 210 L 375 140" fill="none" stroke="#fcfcfc" strokeWidth="30" />
        <path d="M 360 210 L 375 140" fill="none" />
        
        {/* Right Hand */}
        <g transform="translate(375, 140) rotate(15) scale(0.9)">
           {/* Hand Base */}
           <path d="M -15 0 C -25 -10 -25 -30 -10 -40 C 0 -50 20 -40 30 -20 C 35 0 20 15 0 20 Z" fill="#fcfcfc" />
           {/* Thumb */}
           <path d="M -15 0 C -30 -10 -40 -30 -25 -40" fill="#fcfcfc" />
           {/* Fingers */}
           <path d="M -10 -40 L -15 -80 C -15 -85 -5 -85 -5 -75 L 5 -40" fill="#fcfcfc" />
           <path d="M 5 -45 L 15 -90 C 20 -95 30 -90 25 -80 L 15 -35" fill="#fcfcfc" />
           <path d="M 15 -35 L 35 -80 C 40 -85 50 -80 40 -70 L 25 -25" fill="#fcfcfc" />
           <path d="M 25 -20 L 50 -50 C 55 -55 60 -45 50 -35 L 30 -10" fill="#fcfcfc" />
           {/* Hand Overlapping Outline */}
           <path d="M -15 0 C -25 -10 -25 -30 -10 -40 C 0 -50 20 -40 30 -20" fill="none" />
        </g>

        {/* Torso / Shirt */}
        <path d="M 170 500 L 190 280 C 190 250 280 250 310 280 L 340 500 Z" fill="#9dc074" />
        {/* Shirt Creases */}
        <path d="M 280 380 Q 250 400 230 380" fill="none" strokeWidth="4" />
        <path d="M 290 420 Q 260 440 240 420" fill="none" strokeWidth="4" />
        <path d="M 200 400 Q 210 380 220 400" fill="none" strokeWidth="4" />
        
        {/* Left Arm (Front) */}
        <path d="M 180 350 C 140 350 110 300 130 220" fill="none" stroke="#9dc074" strokeWidth="45" />
        <path d="M 180 350 C 140 350 110 300 130 220" fill="none" />
        {/* Sleeve Roll Left */}
        <path d="M 105 210 L 155 220 L 150 240 L 100 230 Z" fill="#9dc074" />
        {/* Left Forearm */}
        <path d="M 130 220 L 100 150" fill="none" stroke="#fcfcfc" strokeWidth="30" />
        <path d="M 130 220 L 100 150" fill="none" />

        {/* Left Hand */}
        <g transform="translate(100, 150) rotate(-15) scale(0.9)">
           {/* Hand Base */}
           <path d="M 15 0 C 25 -10 25 -30 10 -40 C 0 -50 -20 -40 -30 -20 C -35 0 -20 15 0 20 Z" fill="#fcfcfc" />
           {/* Thumb */}
           <path d="M 15 0 C 30 -10 40 -30 25 -40" fill="#fcfcfc" />
           {/* Fingers */}
           <path d="M 10 -40 L 15 -80 C 15 -85 5 -85 5 -75 L -5 -40" fill="#fcfcfc" />
           <path d="M -5 -45 L -15 -90 C -20 -95 -30 -90 -25 -80 L -15 -35" fill="#fcfcfc" />
           <path d="M -15 -35 L -35 -80 C -40 -85 -50 -80 -40 -70 L -25 -25" fill="#fcfcfc" />
           <path d="M -25 -20 L -50 -50 C -55 -55 -60 -45 -50 -35 L -30 -10" fill="#fcfcfc" />
           {/* Hand Overlapping Outline */}
           <path d="M 15 0 C 25 -10 25 -30 10 -40 C 0 -50 -20 -40 -30 -20" fill="none" />
        </g>

        {/* Neck */}
        <rect x="230" y="240" width="40" height="40" fill="#fcfcfc" />

        {/* Head Base */}
        <path d="M 190 180 C 190 100 310 100 310 180 C 310 240 270 270 250 270 C 230 270 190 240 190 180 Z" fill="#fcfcfc" />

        {/* Neckline */}
        <path d="M 220 270 Q 250 290 280 270" fill="none" />

        {/* Ears */}
        <path d="M 190 170 C 170 160 170 190 190 200" fill="#fcfcfc" />
        <path d="M 180 175 Q 185 185 180 190" fill="none" strokeWidth="3" /> {/* Inner ear */}
        
        <path d="M 310 170 C 330 160 330 190 310 200" fill="#fcfcfc" />
        <path d="M 320 175 Q 315 185 320 190" fill="none" strokeWidth="3" /> {/* Inner ear */}

        {/* Hair */}
        <path d="M 180 160 C 170 100 240 70 270 70 C 310 70 330 110 320 160 C 310 120 280 100 240 120 C 220 130 190 130 180 160 Z" fill="#263238" />
        <path d="M 270 70 C 280 40 320 50 330 90 C 330 100 310 90 270 70 Z" fill="#263238" />
        {/* Hair Front swoop */}
        <path d="M 190 130 Q 230 100 270 130 Q 230 110 190 130 Z" fill="#263238" />
        
        {/* Face Details */}
        {/* Eyebrows */}
        <path d="M 220 145 Q 230 135 240 145" fill="none" strokeWidth="4" />
        <path d="M 260 145 Q 270 135 280 145" fill="none" strokeWidth="4" />
        
        {/* Eyes */}
        <circle cx="230" cy="165" r="5" fill="#263238" stroke="none" />
        <circle cx="270" cy="165" r="5" fill="#263238" stroke="none" />
        
        {/* Nose */}
        <path d="M 250 170 L 245 190 L 255 190" fill="none" strokeWidth="4" strokeLinejoin="round" />
        
        {/* Smile */}
        <path d="M 235 210 Q 250 230 265 210 Z" fill="#fcfcfc" strokeWidth="4" />
        {/* Bottom lip crease */}
        <path d="M 245 235 Q 250 240 255 235" fill="none" strokeWidth="3" />

      </g>
      
      {/* Lightbulb (like in the reference) */}
      <g transform="translate(350, 40) scale(0.8)" stroke="#263238" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round">
        <path d="M 50 100 L 50 110 L 70 110 L 70 100 Z" fill="#263238" />
        <path d="M 55 110 L 65 110 L 60 125 Z" fill="#263238" />
        <path d="M 50 105 L 70 105" fill="none" stroke="#fcfcfc" strokeWidth="3" />
        
        <circle cx="60" cy="60" r="40" fill="#f48b43" />
        <path d="M 50 80 L 55 60 C 55 50 65 50 65 60 L 70 80" fill="none" stroke="#263238" strokeWidth="4" />
        {/* Glow lines */}
        <line x1="60" y1="-5" x2="60" y2="-20" stroke="#f48b43" strokeWidth="6" strokeLinecap="round" />
        <line x1="15" y1="15" x2="0" y2="0" stroke="#f48b43" strokeWidth="6" strokeLinecap="round" />
        <line x1="105" y1="15" x2="120" y2="0" stroke="#f48b43" strokeWidth="6" strokeLinecap="round" />
      </g>
    </svg>
  );
};
