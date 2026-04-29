/**
 * Centralized logging utility for FME.
 * 
 * Controlled by process.env.DEBUG.
 */

const isDebug = !!process.env.DEBUG || process.env.NODE_ENV === "development";

export const logger = {
  info: (...args: any[]) => {
    console.log(...args);
  },
  debug: (...args: any[]) => {
    if (isDebug) {
      console.log(...args);
    }
  },
  warn: (...args: any[]) => {
    console.warn(...args);
  },
  error: (...args: any[]) => {
    console.error(...args);
  }
};
