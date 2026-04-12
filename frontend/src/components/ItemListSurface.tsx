import type { ReactNode } from "react";

interface ItemListSurfaceProps {
  controls?: ReactNode;
  children: ReactNode;
}

interface ItemListRowProps {
  title: ReactNode;
  subtitle?: ReactNode;
  chips?: ReactNode;
  details?: ReactNode;
  actions?: ReactNode;
  selected?: boolean;
  active?: boolean;
}

interface ItemListEmptyProps {
  icon?: ReactNode;
  title: string;
  description: string;
}

export function ItemListSurface({ controls, children }: ItemListSurfaceProps) {
  return (
    <section className="space-y-4 rounded-3xl bg-slate-100/70 p-3 sm:p-4">
      {controls && (
        <div className="rounded-2xl bg-white/85 p-3 shadow-sm shadow-slate-900/5 backdrop-blur-sm sm:p-4">
          {controls}
        </div>
      )}
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function ItemListRow({
  title,
  subtitle,
  chips,
  details,
  actions,
  selected = false,
  active = false,
}: ItemListRowProps) {
  const containerClassName = [
    "group rounded-2xl bg-white p-4 shadow-sm shadow-slate-900/5 transition duration-200",
    active
      ? "ring-2 ring-emerald-200 bg-emerald-50/40"
      : "hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-900/10",
    selected ? "ring-2 ring-indigo-200" : "ring-1 ring-slate-200/70",
  ].join(" ");

  return (
    <article className={containerClassName}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-slate-900">{title}</h3>
            {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          </div>
          {chips && <div className="flex flex-wrap items-center gap-2">{chips}</div>}
          {details && <div className="text-sm text-slate-600">{details}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">{actions}</div>}
      </div>
    </article>
  );
}

export function ItemListEmpty({ icon, title, description }: ItemListEmptyProps) {
  return (
    <div className="rounded-2xl bg-white/90 px-4 py-10 text-center ring-1 ring-slate-200/70">
      {icon && <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center text-slate-300">{icon}</div>}
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

export function ItemListRowSkeleton() {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200/70">
      <div className="animate-pulse space-y-3">
        <div className="h-4 w-40 rounded bg-slate-200" />
        <div className="h-3 w-64 rounded bg-slate-100" />
        <div className="flex gap-2">
          <div className="h-6 w-24 rounded-full bg-slate-100" />
          <div className="h-6 w-20 rounded-full bg-slate-100" />
        </div>
      </div>
    </div>
  );
}
