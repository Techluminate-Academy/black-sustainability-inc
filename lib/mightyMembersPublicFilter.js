/** Exclude deactivated members from public map/list/search (missing status = active). */
function applyActiveMembersOnlyQuery(query) {
  if (!query || typeof query !== "object") return;
  query.accountStatus = { $ne: "deactivated" };
}

/** Early $match stage for aggregation pipelines. */
function activeMembersPipelineMatch() {
  return { $match: { accountStatus: { $ne: "deactivated" } } };
}

module.exports = {
  applyActiveMembersOnlyQuery,
  activeMembersPipelineMatch,
};
