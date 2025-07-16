import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";

interface GlobalCommandPaletteContextProps {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const GlobalCommandPaletteContext = createContext<
  GlobalCommandPaletteContextProps | undefined
>(undefined);

export function GlobalCommandPaletteProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to open command palette
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        open();
      }
      // Escape to close
      if (e.key === "Escape" && isOpen) {
        close();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, open, close]);

  const value = {
    isOpen,
    open,
    close,
    toggle,
  };

  return (
    <GlobalCommandPaletteContext.Provider value={value}>
      {children}
    </GlobalCommandPaletteContext.Provider>
  );
}

export function useGlobalCommandPalette() {
  const context = useContext(GlobalCommandPaletteContext);
  if (!context) {
    throw new Error(
      "useGlobalCommandPalette must be used within a GlobalCommandPaletteProvider",
    );
  }
  return context;
}
