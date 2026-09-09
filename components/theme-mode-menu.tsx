"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ThemeMode = "light" | "dark" | "system";

const themeStorageKey = "gerenciamento-status:theme-mode";

const themeOptions: Array<{ label: string; mode: ThemeMode }> = [
  { label: "Claro", mode: "light" },
  { label: "Escuro", mode: "dark" },
  { label: "Sistema", mode: "system" },
];

function getStoredThemeMode(): ThemeMode {
  const storedTheme = window.localStorage.getItem(themeStorageKey);

  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return "system";
}

function resolveThemeMode(mode: ThemeMode) {
  if (mode !== "system") {
    return mode;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyThemeMode(mode: ThemeMode) {
  const resolvedTheme = resolveThemeMode(mode);

  document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  document.documentElement.style.colorScheme = resolvedTheme;
}

function getThemeModeIcon(mode: ThemeMode) {
  if (mode === "light") {
    return Sun;
  }

  if (mode === "dark") {
    return Moon;
  }

  return Monitor;
}

export function ThemeModeMenu() {
  const [selectedMode, setSelectedMode] = useState<ThemeMode>("system");
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedTheme = getStoredThemeMode();

    setSelectedMode(storedTheme);
    applyThemeMode(storedTheme);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    function updateSystemTheme() {
      if (getStoredThemeMode() === "system") {
        applyThemeMode("system");
      }
    }

    mediaQuery.addEventListener("change", updateSystemTheme);
    return () => mediaQuery.removeEventListener("change", updateSystemTheme);
  }, []);

  useEffect(() => {
    function closeMenu(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);

  function selectThemeMode(mode: ThemeMode) {
    window.localStorage.setItem(themeStorageKey, mode);
    setSelectedMode(mode);
    applyThemeMode(mode);
    setIsOpen(false);
  }

  const CurrentThemeIcon = getThemeModeIcon(selectedMode);

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        aria-label="Alternar tema"
        aria-expanded={isOpen}
      >
        <CurrentThemeIcon className="h-4 w-4" />
      </Button>
      {isOpen ? (
        <div className="absolute right-0 top-full z-20 mt-2 w-40 overflow-hidden rounded-md border bg-card py-1 shadow-lg">
          {themeOptions.map((option) => {
            const isSelected = selectedMode === option.mode;

            return (
              <button
                className={cn(
                  "flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium hover:bg-muted",
                  isSelected ? "text-foreground" : "text-muted-foreground",
                )}
                key={option.mode}
                onClick={() => selectThemeMode(option.mode)}
                type="button"
              >
                <span className="flex items-center gap-2">
                  <ThemeOptionIcon mode={option.mode} />
                  {option.label}
                </span>
                {isSelected ? <Check className="h-4 w-4" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function ThemeOptionIcon({ mode }: { mode: ThemeMode }) {
  if (mode === "light") {
    return <Sun className="h-4 w-4" />;
  }

  if (mode === "dark") {
    return <Moon className="h-4 w-4" />;
  }

  return <Monitor className="h-4 w-4" />;
}
