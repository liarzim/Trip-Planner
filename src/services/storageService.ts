import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebaseConfig';

/**
 * Uploads a file from a local device URI to Firebase Storage under 'trips/[tripId]/[fileName]'.
 * Converts the file URI to a Blob and returns the resolved download URL string.
 */
export const uploadTripDocument = async (
  tripId: string,
  uri: string,
  fileName: string
): Promise<string> => {
  // Convert device file URI to a Blob using fetch
  const response = await fetch(uri);
  const blob = await response.blob();

  // Create a reference in Firebase Storage
  const storageRef = ref(storage, `trips/${tripId}/${fileName}`);

  // Upload the blob
  await uploadBytes(storageRef, blob);

  // Retrieve and return the public download URL
  return getDownloadURL(storageRef);
};
