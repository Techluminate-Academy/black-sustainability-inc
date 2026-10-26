import React from "react";
import { getMemberOrganization, getMemberAffiliation } from "@/lib/memberOrganizations";

export default function MemberOrganizationDetails({ fields, isAuthenticated }: {
  fields: Record<string, unknown>;
  isAuthenticated: boolean;
}) {
  if (!isAuthenticated) return null;
  const organization = getMemberOrganization({ fields });
  const affiliation = getMemberAffiliation({ fields });
  if (!organization && !affiliation) return null;
  return (
    <dl className="space-y-2 text-sm break-words" data-testid="member-organization-details">
      {organization && <div><dt className="text-xs font-semibold text-gray-500">Organization</dt><dd>{organization}</dd></div>}
      {affiliation && <div><dt className="text-xs font-semibold text-gray-500">Affiliated entity</dt><dd><span aria-hidden="true">⭐ </span>{affiliation}</dd></div>}
    </dl>
  );
}
