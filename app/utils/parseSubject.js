const parseSubject = (subject) => {
    const subjectStr = subject?.split('- ') || [];

    if (subjectStr.length >= 1) {
        return subjectStr[subjectStr.length - 1];
    }

    return subject;
};

module.exports = parseSubject