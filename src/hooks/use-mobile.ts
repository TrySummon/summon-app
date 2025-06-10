import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile(customBreakpoint?: number) {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    undefined,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(
      `(max-width: ${customBreakpoint ?? MOBILE_BREAKPOINT - 1}px)`,
    );
    const onChange = () => {
      setIsMobile(window.innerWidth < (customBreakpoint ?? MOBILE_BREAKPOINT));
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < (customBreakpoint ?? MOBILE_BREAKPOINT));
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
