"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  TenantPeopleFields,
  emptyTenantPerson,
  type TenantPersonForm,
} from "@/features/landlord/TenantPeopleFields";
import {
  accountDisplayName,
  isValidEmail,
  normalizeEmail,
  syncAuthLoginEmail,
} from "@/lib/auth";
import { useData } from "@/lib/store";
import type { Tenant } from "@/types";

interface EditTenantModalProps {
  tenant: Tenant | null;
  onClose: () => void;
}

function personFromTenant(tenant: Tenant): { primary: TenantPersonForm; secondary: TenantPersonForm } {
  return {
    primary: {
      name: tenant.fullName ?? "",
      email: tenant.email ?? "",
      phone: tenant.phone ?? "",
      idNumber: tenant.idNumber ?? "",
    },
    secondary: {
      name: tenant.secondaryFullName ?? "",
      email: tenant.secondaryEmail ?? "",
      phone: tenant.secondaryPhone ?? "",
      idNumber: tenant.secondaryIdNumber ?? "",
    },
  };
}

function emailOwnedElsewhere(
  email: string,
  tenantId: string,
  users: { email?: string; tenantId?: string }[],
  landlords: { email?: string }[],
  tenants: Tenant[],
): boolean {
  const needle = normalizeEmail(email);
  if (!needle) return false;
  if (landlords.some((l) => l.email && normalizeEmail(l.email) === needle)) return true;
  if (
    tenants.some(
      (t) =>
        t.id !== tenantId &&
        ((t.email && normalizeEmail(t.email) === needle) ||
          (t.secondaryEmail && normalizeEmail(t.secondaryEmail) === needle)),
    )
  ) {
    return true;
  }
  return users.some(
    (u) => u.tenantId !== tenantId && u.email && normalizeEmail(u.email) === needle,
  );
}

/** Edit primary + secondary tenant contact / login fields. */
export function EditTenantModal({ tenant, onClose }: EditTenantModalProps) {
  const { updateTenant, landlords, tenants, users } = useData();
  const [primary, setPrimary] = useState<TenantPersonForm>(() => emptyTenantPerson());
  const [secondary, setSecondary] = useState<TenantPersonForm>(() => emptyTenantPerson());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps -- reset form when opening a different tenant */
  useEffect(() => {
    if (!tenant) return;
    const next = personFromTenant(tenant);
    setPrimary(next.primary);
    setSecondary(next.secondary);
    setError("");
    setSaving(false);
  }, [tenant?.id]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  if (!tenant) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!isValidEmail(primary.email)) {
      setError("יש להזין מייל תקין לשוכר 1.");
      return;
    }
    const primaryMail = normalizeEmail(primary.email);
    if (emailOwnedElsewhere(primaryMail, tenant.id, users, landlords, tenants)) {
      setError("המייל של שוכר 1 כבר משויך למשתמש במערכת.");
      return;
    }

    const secondaryMail = secondary.email.trim();
    const hasSecondary =
      Boolean(secondary.name.trim()) ||
      Boolean(secondary.phone.trim()) ||
      Boolean(secondaryMail) ||
      Boolean(secondary.idNumber.trim());

    if (hasSecondary && secondaryMail) {
      if (!isValidEmail(secondaryMail)) {
        setError("מייל שוכר 2 אינו תקין.");
        return;
      }
      if (normalizeEmail(secondaryMail) === primaryMail) {
        setError("מייל שוכר 2 חייב להיות שונה ממייל שוכר 1.");
        return;
      }
      if (emailOwnedElsewhere(secondaryMail, tenant.id, users, landlords, tenants)) {
        setError("המייל של שוכר 2 כבר משויך למשתמש במערכת.");
        return;
      }
    }

    const logins = users.filter((u) => u.role === "tenant" && u.tenantId === tenant.id);
    const oldPrimary = normalizeEmail(tenant.email);
    const oldSecondary = tenant.secondaryEmail ? normalizeEmail(tenant.secondaryEmail) : "";
    const primaryLogin =
      logins.find((u) => u.email && normalizeEmail(u.email) === oldPrimary) ??
      (logins.length === 1 && !oldSecondary ? logins[0] : undefined);
    const secondaryLogin = oldSecondary
      ? logins.find((u) => u.email && normalizeEmail(u.email) === oldSecondary)
      : undefined;

    const authSyncs: { userId: string; email: string }[] = [];
    if (primaryLogin && primaryMail !== oldPrimary) {
      authSyncs.push({ userId: primaryLogin.id, email: primaryMail });
    }
    const nextSecondary = hasSecondary && secondaryMail ? normalizeEmail(secondaryMail) : "";
    if (secondaryLogin && nextSecondary && nextSecondary !== oldSecondary) {
      authSyncs.push({ userId: secondaryLogin.id, email: nextSecondary });
    }

    setSaving(true);
    setError("");
    try {
      for (const sync of authSyncs) {
        const result = await syncAuthLoginEmail(sync.userId, sync.email);
        if (!result.ok) {
          setError(result.error);
          setSaving(false);
          return;
        }
      }

      updateTenant(tenant.id, {
        fullName: accountDisplayName(primary.name, primaryMail),
        email: primaryMail,
        phone: primary.phone.trim(),
        idNumber: primary.idNumber.trim() || undefined,
        idPhotoUploaded: Boolean(primary.idNumber.trim()) || tenant.idPhotoUploaded,
        ...(hasSecondary
          ? {
              secondaryFullName: secondary.name.trim() || undefined,
              secondaryEmail: secondaryMail ? normalizeEmail(secondaryMail) : undefined,
              secondaryPhone: secondary.phone.trim() || undefined,
              secondaryIdNumber: secondary.idNumber.trim() || undefined,
            }
          : {
              secondaryFullName: undefined,
              secondaryEmail: undefined,
              secondaryPhone: undefined,
              secondaryIdNumber: undefined,
            }),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={!!tenant}
      onClose={onClose}
      title="עריכת פרטי שוכר"
      description="עדכון מייל, שם, טלפון ומס׳ ת״ז — כולל שוכר נוסף בחוזה"
    >
      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        <TenantPeopleFields
          primary={primary}
          secondary={secondary}
          onPrimaryChange={(next) => {
            setPrimary(next);
            setError("");
          }}
          onSecondaryChange={(next) => {
            setSecondary(next);
            setError("");
          }}
        />
        {error && (
          <p className="rounded-lg bg-[#fdecea] px-3 py-2 text-xs font-medium text-danger">{error}</p>
        )}
        <Button type="submit" fullWidth size="lg" disabled={saving}>
          {saving ? "שומר…" : "שמירת שינויים"}
        </Button>
      </form>
    </Modal>
  );
}
