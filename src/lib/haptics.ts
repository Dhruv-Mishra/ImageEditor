'use client';

import { useCallback, useRef, useEffect } from 'react';
import { useWebHaptics } from 'web-haptics/react';

type HapticPattern = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'error' | 'warning';

/**
 * Haptic patterns using web-haptics Vibration[] format.
 * web-haptics uses AudioContext under the hood, which works on iOS Safari
 * unlike the native Vibration API (Android-only).
 */
const PATTERNS: Record<HapticPattern, { pattern: { duration: number; delay?: number }[]; intensity: number }> = {
    light:     { pattern: [{ duration: 10 }], intensity: 0.4 },
    selection: { pattern: [{ duration: 15 }], intensity: 0.5 },
    medium:    { pattern: [{ duration: 30 }], intensity: 0.7 },
    heavy:     { pattern: [{ duration: 60 }], intensity: 1.0 },
    success:   { pattern: [{ duration: 20 }, { duration: 30, delay: 100 }], intensity: 0.8 },
    warning:   { pattern: [{ duration: 40 }, { duration: 40, delay: 50 }], intensity: 0.7 },
    error:     { pattern: [{ duration: 40 }, { duration: 40, delay: 50 }], intensity: 0.9 },
};

export function useAppHaptics() {
    const { trigger, isSupported } = useWebHaptics();
    const triggerRef = useRef(trigger);
    useEffect(() => { triggerRef.current = trigger; }, [trigger]);

    const vibrate = useCallback((pattern: HapticPattern | number) => {
        try {
            if (typeof pattern === 'number') {
                triggerRef.current([{ duration: pattern }], { intensity: 0.6 });
                return;
            }
            const preset = PATTERNS[pattern];
            if (preset) {
                triggerRef.current(preset.pattern, { intensity: preset.intensity });
            }
        } catch {
            // Haptics not available — silently ignore
        }
    }, []);

    return { vibrate, isSupported };
}
