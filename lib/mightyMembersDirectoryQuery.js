const { memberPhotoSortTierExpr } = require("./memberMapPhotoUrl");

/**
 * Paginated directory list: https avatars first, then legacy Airtable photos (stable _id tie-break).
 *
 * @param {import("mongodb").Collection} collection
 * @param {object} params
 * @param {object} params.match Mongo $match filter
 * @param {number} params.skip
 * @param {number} params.limit
 * @returns {Promise<object[]>}
 */
async function fetchDirectoryMembersPage(collection, { match, skip, limit }) {
  const pipeline = [
    { $match: match },
    { $addFields: { _photoSortTier: memberPhotoSortTierExpr() } },
    { $sort: { _photoSortTier: -1, _id: 1 } },
    { $skip: skip },
    { $limit: limit },
    { $project: { _photoSortTier: 0 } },
  ];

  return collection.aggregate(pipeline).toArray();
}

module.exports = {
  fetchDirectoryMembersPage,
};
