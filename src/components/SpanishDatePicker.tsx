"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

type SpanishDatePickerProps = {
  value: string;
  onChange: (isoDate: string) => void;
  id?: string;
};

const WEEKDAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

function parseIso(iso: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { y, m: mo - 1, d };
}

function toIso(y: number, monthIndex: number, day: number): string {
  const mm = String(monthIndex + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

function monthGrid(year: number, monthIndex: number): (number | null)[] {
  const first = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const startPad = (first.getDay() + 6) % 7;
  const cells: (number | null)[] = [];
  for (let i = 0; i < startPad; i += 1) cells.push(null);
  for (let d = 1; d <= lastDay; d += 1) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function formatButtonLabel(iso: string): string {
  const p = parseIso(iso);
  if (!p) return "Elegir fecha";
  const date = new Date(p.y, p.m, p.d);
  return date.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function SpanishDatePicker({ value, onChange, id }: SpanishDatePickerProps) {
  const autoId = useId();
  const buttonId = id ?? `sdp-${autoId}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const parsed = parseIso(value);
  const initialView = parsed ?? { y: new Date().getFullYear(), m: new Date().getMonth(), d: 1 };
  const [viewYear, setViewYear] = useState(initialView.y);
  const [viewMonth, setViewMonth] = useState(initialView.m);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const monthTitle = useMemo(() => {
    const d = new Date(viewYear, viewMonth, 1);
    return d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  }, [viewYear, viewMonth]);

  const cells = useMemo(() => monthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  function goPrevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function goNextMonth() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function selectDay(day: number) {
    onChange(toIso(viewYear, viewMonth, day));
    setOpen(false);
  }

  const selectedParsed = parsed;

  return (
    <div className="date-picker-root" ref={rootRef}>
      <button
        id={buttonId}
        type="button"
        className="date-picker-trigger"
        onClick={() => {
          if (!open && parsed) {
            setViewYear(parsed.y);
            setViewMonth(parsed.m);
          }
          setOpen((o) => !o);
        }}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        {formatButtonLabel(value)}
      </button>
      {open ? (
        <div className="date-picker-panel" role="dialog" aria-label="Calendario">
          <div className="date-picker-nav">
            <button type="button" className="date-picker-nav-btn" onClick={goPrevMonth} aria-label="Mes anterior">
              ‹
            </button>
            <span className="date-picker-month capitalize">{monthTitle}</span>
            <button type="button" className="date-picker-nav-btn" onClick={goNextMonth} aria-label="Mes siguiente">
              ›
            </button>
          </div>
          <div className="date-picker-weekdays">
            {WEEKDAY_LABELS.map((label, i) => (
              <span key={i} className="date-picker-wd">
                {label}
              </span>
            ))}
          </div>
          <div className="date-picker-grid">
            {cells.map((day, index) => {
              if (day === null) {
                return <span key={`e-${index}`} className="date-picker-cell date-picker-cell--empty" />;
              }
              const isSelected =
                selectedParsed &&
                selectedParsed.y === viewYear &&
                selectedParsed.m === viewMonth &&
                selectedParsed.d === day;
              return (
                <button
                  key={day}
                  type="button"
                  className={`date-picker-cell ${isSelected ? "is-selected" : ""}`}
                  onClick={() => selectDay(day)}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
