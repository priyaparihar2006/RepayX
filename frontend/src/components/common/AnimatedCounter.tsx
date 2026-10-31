import React, { useEffect, useState, useRef } from 'react';

/**
 * Animated counter that counts up numbers with commas, decimals, currencies,
 * and percentages smoothly on mount using cubic ease-out.
 */
export const AnimatedCounter: React.FC<{
  value: string | number;
  duration?: number;
  className?: string;
}> = ({ value, duration = 1200, className = '' }) => {
  const strVal = String(value);
  const [display, setDisplay] = useState(strVal);
  const prevValRef = useRef(strVal);

  useEffect(() => {
    // Match any leading characters (like ₹, $, ±), number with possible commas/decimals, and trailing text (like %, etc.)
    const match = strVal.match(/^([^0-9.-]*)([0-9,]+(?:\.[0-9]+)?)(.*)$/);
    if (!match) {
      setDisplay(strVal);
      return;
    }

    const [, prefix, numStr, suffix] = match;
    const cleanTarget = parseFloat(numStr.replace(/,/g, ''));
    if (isNaN(cleanTarget)) {
      setDisplay(strVal);
      return;
    }

    const hasComma = numStr.includes(',');
    const decimals = numStr.includes('.') ? numStr.split('.')[1].length : 0;

    let startTimestamp: number | null = null;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);
      // Fast start, soft landing ease-out curve
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentVal = cleanTarget * easeProgress;

      let formattedNumber: string;
      if (decimals > 0) {
        formattedNumber = currentVal.toFixed(decimals);
      } else {
        formattedNumber = Math.round(currentVal).toString();
      }

      if (hasComma) {
        const parts = formattedNumber.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        formattedNumber = parts.join('.');
      }

      setDisplay(`${prefix}${formattedNumber}${suffix}`);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setDisplay(strVal);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [strVal, duration]);

  return <span className={className}>{display}</span>;
};
