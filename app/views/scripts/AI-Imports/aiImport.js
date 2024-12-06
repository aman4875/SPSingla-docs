AWS.config.update({
    accessKeyId: config.keyId,
    secretAccessKey: config.accessKey,
    region: config.region,
});
const s3 = new AWS.S3();
const bucketName = config.bucketName;

const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024;

$("#doc_site").on("change", function () {
    console.log();
    
    var selectedSiteParentId = $(this).find("option:selected").data("parent-id");
    var folderSelect = $("#doc_folder");
    folderSelect.val("");
    folderSelect.empty().append('<option label="empty" value=""></option>');
    folders.forEach(function (folder) {
        if (folder.site_parent_id == selectedSiteParentId) {
            folderSelect.append('<option data-site-id="' + folder.site_id + '" value="' + folder.site_name + '">' + folder.site_name + "</option>");
        }
    });
});
$("#bulkForm").submit(function (event) {
    event.preventDefault();

    if (!this.checkValidity()) {
        return false;
    }

    const file = document.getElementById("doc_file").files[0];
    const selectedFolderOption = $("#doc_folder").find("option:selected");
    const siteId = selectedFolderOption.data("site-id");

    const key = `uploads/${siteId}_${token.user_id}_${fileName}`;
    NioApp.handleButtonState("uploadZipButton", "Uploading...", true);

    const params = {
        Bucket: bucketName,
        Key: key,
        Body: file,
        CORSConfiguration: {
            CORSRules: [
                {
                    AllowedHeaders: ["*"],
                    AllowedMethods: ["GET", "POST", "PUT", "DELETE", "HEAD"],
                    AllowedOrigins: ["*"],
                    ExposeHeaders: ["ETag"],
                    MaxAgeSeconds: 3000,
                },
            ],
        },
    };

    s3.upload(params, function (err, data) {
        if (err) {
            console.error("Error uploading file:", err);
            NioApp.handleButtonState("uploadZipButton", "Upload File", false);
            NioApp.Toast("<h5>Upload Failed</h5><p>Error Uploading File</p>", "error");
        } else {
            $("#progress-percentage").addClass("d-none");
            NioApp.Toast("<h5>Upload Success</h5><p>File Uploaded Successfully</p>", "success");
            $("#card-2").removeClass("d-none");
            $("#card-1").addClass("d-none");
        }
    }).on("httpUploadProgress", function (progress) {
        const percent = Math.round((progress.loaded / progress.total) * 100);
        $("#progress-percentage").removeClass("d-none").html(`${percent}%`);
    });
});
