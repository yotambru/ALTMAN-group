import { redirect } from "next/navigation";

/** Professional login role is retired; keep the path from 404-ing old sessions. */
export default function ProfessionalRoleRemoved() {
  redirect("/");
}
