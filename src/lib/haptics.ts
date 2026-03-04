'use client';

import { useWebHaptics } from 'web-haptics/react';
import { useCallback } from 'react';

type HapticPattern = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'error' | 'warning';

export function useAppHaptics() {
    const { trigger } = useWebHaptics();

    const vibrate = useCallback((pattern: HapticPattern | number) => {
        try {
            if (pattern === 'light') {
                trigger([{ duration: 15 }], { intensity: 0.3 });
            } else if (pattern === 'medium') {
                trigger([{ duration: 30 }], { intensity: 0.5 });
            } else if (pattern === 'heavy') {
                trigger([{ duration: 45 }], { intensity: 1.0 });
            } else if (pattern === 'selection') {
                trigger([{ duration: 10 }], { intensity: 0.2 });
            } else if (pattern === 'success') {
                trigger([{ duration: 25 }, { duration: 0 }, { duration: 40 }], { intensity: 0.8 });
            } else if (pattern === 'warning' || pattern === 'error') {
                trigger([{ duration: 40 }, { duration: 0 }, { duration: 40 }], { intensity: 0.9 });
            } else if (typeof pattern === 'number') {
                trigger([{ duration: pattern }], { intensity: 0.5 });
            }

            // Fallback for native Android if web-haptics fails elegantly in some configs
            if (typeof window !== 'undefined' && navigator && navigator.vibrate) {
                let val: number | number[] = 50;
                if (pattern === 'light') val = 10;
                if (pattern === 'selection') val = 15;
                if (pattern === 'success') val = [20, 100, 30];
                if (pattern === 'heavy') val = 60;
                if (typeof pattern === 'number') val = pattern;

                // Fire native fallback silently 
                navigator.vibrate(val);
            }
        } catch (e) {
            // ignore
        }
    }, [trigger]);

    return { vibrate };
}
