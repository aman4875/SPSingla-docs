
const checkFolderExists = async (s3, bucketName, folderName) => {
  try {
    // Ensure the folder name ends with a '/'
    if (!folderName.endsWith('/')) {
      folderName += '/';
    }

    const params = {
      Bucket: bucketName,
      Prefix: folderName,
      MaxKeys: 10, // Check up to 10 items for existence
    };

    const data = await s3.listObjectsV2(params).promise();

    if (data.Contents.length === 0) {
      // No objects found, folder does not exist
      return { folderExists: false, filesExist: false };
    }

    // Check if any objects other than the folder itself exist
    const filesExist = data.Contents.some(
      (item) => item.Key !== folderName 
    );

    return { folderExists: true, filesExist };
  } catch (error) {
    console.error('Error checking folder and files existence:', error);
    throw error;
  }
};


module.exports = checkFolderExists