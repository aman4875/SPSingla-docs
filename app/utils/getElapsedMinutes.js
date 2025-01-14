const moment = require('moment')

function getElapsedMinutes(startTimeStr) {
    
    const startTime = moment(startTimeStr, "DD/MM/YYYY hh:mm:ss A");
    
    if (!startTime.isValid()) {
        console.error("Invalid date format. Please use 'DD/MM/YYYY hh:mm:ss A'.");
        return NaN;
    }

    const now = moment();
    return now.diff(startTime, 'minutes');
}

module.exports = getElapsedMinutes