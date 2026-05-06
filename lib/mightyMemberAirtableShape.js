/**
 * Map a Mongo `mightyMembers` document to the Airtable-shaped `fields` object the UI expects.
 */
function toAirtableishDoc(d) {
  const id = d?._id ? String(d._id) : d?.mightyId != null ? String(d.mightyId) : "";
  const first = d?.firstName || "";
  const last = d?.lastName || "";
  const fullName = `${first} ${last}`.trim();
  const photoUrl = d?.avatarUrl || "";
  return {
    id,
    fields: {
      "FIRST NAME": d?.firstName || "",
      "LAST NAME": d?.lastName || "",
      "FULL NAME": fullName,
      "EMAIL ADDRESS": d?.email || "",
      "PRIMARY INDUSTRY HOUSE": d?.industry || "",
      "Location (Nearest City)": d?.location || "",
      BIO: d?.bio || "",
      WEBSITE: "",
      "ORGANIZATION NAME": "",
      "MEMBER LEVEL": "",
      PHOTO: photoUrl ? [{ url: photoUrl }] : [],
      "LATITUDE (NEW)": d?.latitude ?? null,
      "LONGITUDE (NEW)": d?.longitude ?? null,
      userphoto: photoUrl || null,
    },
  };
}

module.exports = { toAirtableishDoc };
