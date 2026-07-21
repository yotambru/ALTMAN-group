"use client";

import { Briefcase, Check, Home, KeyRound } from "lucide-react";
import type { Role } from "@/types";
import { cn } from "@/lib/utils";

const roles: { id: Role; label: string; icon: typeof Home }[] = [
  { id: "tenant", label: "שוכר", icon: KeyRound },
  { id: "landlord", label: "משכיר", icon: Home },
  { id: "manager", label: "מנהל", icon: Briefcase },
];

interface RoleSelectorProps {
  value: Role;
  onChange: (role: Role) => void;
}

export function RoleSelector({ value, onChange }: RoleSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-3" role="radiogroup" aria-label="בחירת תפקיד">
      {roles.map((role) => {
        const selected = value === role.id;
        return (
          <button
            key={role.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(role.id)}
            className={cn(
              "relative flex flex-col items-center gap-2 rounded-2xl border-2 px-2 py-4 transition-all",
              selected
                ? "border-navy bg-navy/5 shadow-sm"
                : "border-border bg-surface hover:border-navy/30",
            )}
          >
            {selected && (
              <span className="absolute -end-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-orange text-white shadow">
                <Check className="h-4 w-4" strokeWidth={3} />
              </span>
            )}
            <role.icon
              className={cn("h-7 w-7", selected ? "text-navy" : "text-text-muted")}
              strokeWidth={1.8}
            />
            <span
              className={cn(
                "text-sm font-bold",
                selected ? "text-navy" : "text-text",
              )}
            >
              {role.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
