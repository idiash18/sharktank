"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { LEVEL_STYLE, type Level } from "@/lib/format";

export function Card({ title, subtitle, action, className = "", children }: {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className}`}>
      {(title || action) && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Pill({ level, children }: { level: Level; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${LEVEL_STYLE[level].pill}`}>
      {children}
    </span>
  );
}

export function StatusDot({ level, pulse = false }: { level: Level; pulse?: boolean }) {
  return (
    <span className="relative inline-flex h-2 w-2">
      {pulse && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${LEVEL_STYLE[level].dot}`} />}
      <span className={`relative inline-flex h-2 w-2 rounded-full ${LEVEL_STYLE[level].dot}`} />
    </span>
  );
}

export function Button({ variant = "secondary", className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  const styles = {
    primary: "bg-sky-700 text-white hover:bg-sky-800 disabled:bg-sky-300",
    secondary: "bg-white text-slate-800 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:text-slate-400",
    danger: "bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-300",
    ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  }[variant];
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed ${styles} ${className}`}
    />
  );
}

/** Small modal dialog built on <dialog> (Esc closes it, focus is trapped). */
export function Modal({ open, onClose, title, children, footer }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[min(92vw,440px)] rounded-2xl p-0 shadow-xl backdrop:bg-slate-900/40"
    >
      <div className="p-6">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <div className="mt-2 text-sm text-slate-600">{children}</div>
      </div>
      {footer && <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-3">{footer}</div>}
    </dialog>
  );
}

/** A horizontal meter from 0 to 100 %. */
export function Meter({ pct, level }: { pct: number; level: Level }) {
  const bar = { good: "bg-sky-500", watch: "bg-amber-500", bad: "bg-rose-500", unknown: "bg-slate-300" }[level];
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}
