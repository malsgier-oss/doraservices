import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>;

/**
 * App theme provider.
 * - defaultTheme="system" enables automatic dark/light based on device/OS preference.
 * - Users can override via the ThemeToggle (stored in localStorage under `storageKey`).
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="dora-theme"
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
