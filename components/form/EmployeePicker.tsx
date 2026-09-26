"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";

import { Avatar } from "@/components/wall/Avatar";
import type { EmployeePublic } from "@/lib/types";
import { cn } from "@/lib/utils";

type EmployeePickerProps = {
  employees: EmployeePublic[];
  value: string;
  onChange: (employeeId: string) => void;
  invalid?: boolean;
};

function matches(employee: EmployeePublic, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase("tr-TR");
  if (!needle) return true;

  return (
    employee.name.toLocaleLowerCase("tr-TR").includes(needle) ||
    employee.email.toLocaleLowerCase("tr-TR").includes(needle)
  );
}

export function EmployeePicker({
  employees,
  value,
  onChange,
  invalid = false,
}: EmployeePickerProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const selected = employees.find((employee) => employee.id === value) ?? null;

  const results = useMemo(
    () => employees.filter((employee) => matches(employee, query)).slice(0, 8),
    [employees, query],
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const choose = (employee: EmployeePublic) => {
    onChange(employee.id);
    setQuery("");
    setIsOpen(false);
  };

  const clear = () => {
    onChange("");
    setQuery("");
    setIsOpen(true);
  };

  if (selected) {
    return (
      <div className="mt-2 flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 p-3">
        <Avatar
          name={selected.name}
          avatarUrl={selected.avatar_url}
          className="size-12 text-base"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-slate-900">{selected.name}</p>
          <p className="truncate text-sm text-slate-500">{selected.email}</p>
        </div>
        <button
          type="button"
          onClick={clear}
          className="rounded-full p-2 text-slate-500 hover:bg-white"
          aria-label="Seçimi kaldır"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative mt-2">
      <div className="relative">
        <input
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-invalid={invalid}
          value={query}
          placeholder="Çalışan ara..."
          autoComplete="off"
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onClick={() => setIsOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setIsOpen(true);
              setActiveIndex((current) =>
                Math.min(current + 1, Math.max(results.length - 1, 0)),
              );
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((current) => Math.max(current - 1, 0));
            }
            if (event.key === "Enter" && isOpen && results[activeIndex]) {
              event.preventDefault();
              choose(results[activeIndex]);
            }
            if (event.key === "Escape") setIsOpen(false);
          }}
          className={cn(
            "flex h-12 w-full rounded-xl border bg-white px-4 pr-10 text-base text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2",
            invalid
              ? "border-rose-400 focus-visible:ring-rose-200"
              : "border-violet-200 focus-visible:border-violet-500 focus-visible:ring-violet-200",
          )}
        />
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-400" />
      </div>

      {isOpen ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-2 max-h-80 w-full overflow-y-auto rounded-2xl border border-violet-100 bg-white p-2 shadow-xl"
        >
          {results.length === 0 ? (
            <li className="px-3 py-4 text-sm text-slate-500">
              Bu aramaya uyan çalışan yok. Listeden birini seçmen gerekiyor.
            </li>
          ) : (
            results.map((employee, index) => (
              <li key={employee.id} role="option" aria-selected={index === activeIndex}>
                <button
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => choose(employee)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left",
                    index === activeIndex ? "bg-violet-50" : "bg-white",
                  )}
                >
                  <Avatar
                    name={employee.name}
                    avatarUrl={employee.avatar_url}
                    className="size-10 text-sm"
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-slate-900">
                      {employee.name}
                    </span>
                    <span className="block truncate text-sm text-slate-500">
                      {employee.email}
                    </span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
