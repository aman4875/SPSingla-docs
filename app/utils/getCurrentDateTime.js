const moment = require('moment')

module.exports = getCurrentDateTime = () => {
    const timeStamp = moment().format("DD/MM/YYYY hh:mm:ss A");
    return timeStamp;
};

