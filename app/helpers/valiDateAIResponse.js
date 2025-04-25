module.exports = function validateAIResponse(response) {
    const isValidDate = (date) => {
        const regex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
        if (!date || !regex.test(date)) return false;

        const [day, month, year] = date.split("/");
        const currentYear = new Date().getFullYear();

        if (parseInt(year) > currentYear) return false;

        const monthDays = [
            31,
            28 + (new Date(year, 1, 29).getDate() === 29 ? 1 : 0),
            31,
            30,
            31,
            30,
            31,
            31,
            30,
            31,
            30,
            31,
        ];
        return parseInt(day) <= monthDays[parseInt(month) - 1];
    };

    const validDate = isValidDate(response.date) ? response.date : null;

    return {
        letter_number:
            typeof response.letter_number === "string" ? response?.letter_number : "",
        references:
            typeof response.references === "string" ? response?.references : "",
        date: validDate,
        subject: typeof response.subject === "string" ? response?.subject : "",
        letter_type:
            typeof response.letter_type === "string" ? response?.letter_type : "",
    };
};
