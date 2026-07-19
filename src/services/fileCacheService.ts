
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

/**
 * Checks if a file is already cached in local FileSystem storage.
 * If yes, returns the local URI. If not, downloads it from the remote URL,
 * caches it locally, and returns the new local URI.
 * On web platforms, simply returns the original URL since local filesystems aren't used.
 */
export const getCachedOrDownloadFile = async (
  downloadUrl: string,
  fileName: string
): Promise<string> => {
  if (Platform.OS === 'web') {
    return downloadUrl;
  }

  const localDir = FileSystem.documentDirectory;
  if (!localDir) {
    throw new Error('Device document directory is not available.');
  }

  // Sanitize filename to be system safe
  const sanitizedFileName = encodeURIComponent(fileName);
  const localUri = `${localDir}${sanitizedFileName}`;

  try {
    const fileInfo = await FileSystem.getInfoAsync(localUri);
    if (fileInfo.exists) {
      return localUri;
    }

    // Download the file
    const downloadResult = await FileSystem.downloadAsync(downloadUrl, localUri);
    return downloadResult.uri;
  } catch (error) {
    console.error('File cache service download failed:', error);
    throw error;
  }
};

/**
 * Helper to check if a file is already stored in the local file cache.
 * Always returns false on web.
 */
export const isFileCached = async (fileName: string): Promise<boolean> => {
  if (Platform.OS === 'web') {
    return false;
  }

  const localDir = FileSystem.documentDirectory;
  if (!localDir) {
    return false;
  }

  const sanitizedFileName = encodeURIComponent(fileName);
  const localUri = `${localDir}${sanitizedFileName}`;

  try {
    const fileInfo = await FileSystem.getInfoAsync(localUri);
    return fileInfo.exists;
  } catch {
    return false;
  }
};
