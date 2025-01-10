function checkFolderType(folderName, letter_number) {
    const types = {
        "AE": "INCOMING",
        "CLIENT": "INCOMING",
        "HO": "OUTGOING",
        "SITE": "OUTGOING"
    };

    // Using Object.keys and find to return the first matching type
    const type = Object.keys(types).find((key) => folderName.includes(key));

    return type ? types[type] : letter_number ? letter_number.startsWith("SPS") ? "OUTGOING" : "INCOMING" : ""
}

module.exports = checkFolderType