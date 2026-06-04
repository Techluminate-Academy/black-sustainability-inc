const { getMemberBio } = require("./memberBio");
const { getMemberMapPhotoUrl } = require("./memberMapPhotoUrl");

/**
 * Map a Mongo `mightyMembers` document to the Airtable-shaped `fields` object the UI expects.
 */
function toAirtableishDoc(d) {
  const id = d?._id ? String(d._id) : d?.mightyId != null ? String(d.mightyId) : "";
  const first = d?.firstName || "";
  const last = d?.lastName || "";
  const fullName = `${first} ${last}`.trim();
  const photoUrl = getMemberMapPhotoUrl(d);
  const logo =
    Array.isArray(d?.fields?.LOGO) && d.fields.LOGO.length
      ? d.fields.LOGO
      : typeof d?.logoUrl === "string" && d.logoUrl.trim().length > 0
        ? [{ url: d.logoUrl.trim() }]
        : [];
  const lng = d?.longitude != null ? Number(d.longitude) : NaN;
  const lat = d?.latitude != null ? Number(d.latitude) : NaN;
  const location =
    Number.isFinite(lng) && Number.isFinite(lat)
      ? { type: "Point", coordinates: [lng, lat] }
      : null;

  return {
    id,
    ...(location ? { location } : {}),
    fields: {
      "FIRST NAME": d?.firstName || "",
      "LAST NAME": d?.lastName || "",
      "FULL NAME": fullName,
      "EMAIL ADDRESS": d?.email || "",
      "PRIMARY INDUSTRY HOUSE":
        d?.industry || d?.fields?.["PRIMARY INDUSTRY HOUSE"] || "",
      "Location (Nearest City)": d?.location || "",
      BIO: getMemberBio(d),
      WEBSITE: "",
      "ORGANIZATION NAME": "",
      "MEMBER LEVEL": "",
      LOGO: logo,
      PHOTO: photoUrl ? [{ url: photoUrl }] : [],
      "Profile Photo URL": photoUrl || "",
      "LATITUDE (NEW)": d?.latitude ?? null,
      "LONGITUDE (NEW)": d?.longitude ?? null,
      userphoto: photoUrl || null,
    },
  };
}

module.exports = { toAirtableishDoc };
