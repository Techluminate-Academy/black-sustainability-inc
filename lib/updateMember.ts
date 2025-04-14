import { connectToDatabase } from "./mongodb"; // adjust the path as needed
import { ObjectId } from "mongodb";

const DATABASE_NAME = "members";
const COLLECTION_NAME = "airtableRecords";

/**
 * Updates a member record in MongoDB using connectToDatabase.
 *
 * @param recordId - The MongoDB document ID of the member record.
 * @param updatedData - The data to update (an object containing fields and new values).
 * @returns A Promise that resolves once the update is complete.
 */
export const updateMemberInMongoDB = async (
  recordId: string,
  updatedData: any
): Promise<void> => {
  try {
    // Connect to the database using the named export connectToDatabase
    const { db } = await connectToDatabase();
    const collection = db.collection(COLLECTION_NAME);

    const result = await collection.updateOne(
      { _id: new ObjectId(recordId) },
      { $set: updatedData }
    );

    console.log(
      `MongoDB update successful for record ${recordId}. Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`
    );

    if (result.modifiedCount === 0) {
      throw new Error("No document was updated. Verify the recordId and updated data.");
    }
  } catch (error) {
    console.error("Error in updateMemberInMongoDB:", error);
    throw error;
  }
};
