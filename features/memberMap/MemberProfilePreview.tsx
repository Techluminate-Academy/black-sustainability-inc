import MemberOrganizationDetails from "@/features/memberMap/MemberOrganizationDetails";
import React, { useState } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import BioWithReadMore from "@/components/common/BioWithReadMore";
import { BSN_PLATFORM_ICON, getMemberDisplayImage } from "@/lib/getMemberDisplayImage";
import { getMemberBioFromAirtableFields } from "@/lib/memberBio";
import { memberIndustryHouse } from "@/lib/memberIndustryHouse";

/** Only render this trigger for authenticated viewers, like the map cards themselves. */
export default function MemberProfilePreview({ fields, children, className }: {
  fields: Record<string, unknown>;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const name = String(fields["FULL NAME"] || [fields["FIRST NAME"], fields["LAST NAME"]].filter(Boolean).join(" ") || "Member");
  const bio = getMemberBioFromAirtableFields(fields);

  return <>
    <button type="button" className={className} aria-label={`View ${name}'s profile`}
      onClick={(event) => { event.stopPropagation(); setOpen(true); }}>
      {children}
    </button>
    <Dialog open={open} onClose={() => setOpen(false)} className="fixed inset-0 z-[100001]"
      onClick={(event) => event.stopPropagation()}>
      <div className="fixed inset-0 bg-black/60" aria-hidden="true" />
      <div className="fixed inset-0 flex items-end sm:items-center justify-center sm:p-6">
        <DialogPanel className="w-full sm:max-w-md max-h-[88dvh] overflow-y-auto rounded-t-2xl sm:rounded-xl bg-white p-6 shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <DialogTitle className="text-lg font-semibold text-gray-900">{name}</DialogTitle>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close member profile"
              className="min-h-[44px] px-3 rounded-md text-sm hover:bg-gray-100">Close</button>
          </div>
          <img src={getMemberDisplayImage(fields)} alt="" className="w-28 h-28 object-contain rounded-lg bg-gray-50"
            referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = BSN_PLATFORM_ICON; }} />
          <dl className="space-y-3 my-4 text-sm">
            <div><dt className="font-semibold">Industry house</dt><dd>{memberIndustryHouse(fields["PRIMARY INDUSTRY HOUSE"])}</dd></div>
            <div><dt className="font-semibold">Location</dt><dd>{String(fields["Location (Nearest City)"] || "Location not provided")}</dd></div>
          </dl>
          <div className="mb-4"><MemberOrganizationDetails fields={fields} isAuthenticated /></div>
          <div className="border-t pt-4 text-sm"><h3 className="font-semibold mb-2">Bio</h3>
            {bio ? <BioWithReadMore bio={bio} isAuthenticated /> : <p>This member hasn’t added a bio yet.</p>}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  </>;
}
