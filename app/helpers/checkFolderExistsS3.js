const checkFolderExists = async (s3,bucketName, folderName) => {
    try {
      // Ensure the folder name ends with a '/'
      if (!folderName.endsWith('/')) {
        folderName += '/';
      }
  
      const params = {
        Bucket: bucketName,
        Prefix: folderName,
        MaxKeys: 1,
      };
  
      const data = await s3.listObjectsV2(params).promise();
  
      // If contents are returned, the folder exists
      return data.Contents.length > 0;
    } catch (error) {
      console.error('Error checking folder existence:', error);
      throw error;
    }
  };

module.exports = checkFolderExists