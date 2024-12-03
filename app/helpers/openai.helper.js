const OpenAIApi = require("openai");

const openai = new OpenAIApi({ apiKey: process.env.OPENAI_API_KEY });

const processOpenAI = async (text) => {
    const prompt = `
    Extract and structure the following information from the given text in JSON object:
    1. Letter Number
    2. References
    3. Date
    4. Subject

    Return a JSON object with these keys:
    {
    "letter_number": "",
    "references": "",
    "date": "",
    "subject": ""
    }

    Rules and Clarifications :- 
    1. letter_number: Include only the first exact alphanumeric code in the specified format found in the document header. Ignore any prefixes like "Ref:" or "No:". Example: SPSCPL/BSRDCL/GANGAPATH/22-23/109 , AECOM-RODIC/BSRDCL/GANGAPATH/SPSCPL/23-24/0127.

    2. references : Include only valid reference numbers found after the Letter Number. Exclude any labels or prefixes. Multiple references should be comma-separated without spaces Example: SPSCPL/BSRDCL/GANGAPATH/22-23/110,AE/TRUMPET/TL/EPC/2023/001.
    There could also be a scenario where the Ref: numbers can be number wise 1.,2.,3.,4. etc and could end with date Example(date 18.07.2023) or start with some text  you should only extract Ref: number don't inculued date or any prefixes here are some Example
    1. Ref: 1. SPSCPL/BSRDCL/GANGAPATH/AE/22-23/253 dated 18.07.2023
         2. AECOM-RODIC/BSRDCL/GANGAPATH/SPSCPL/23-24/0118 dated 27.06.2023
         3. SPSCPL/BSRDCL/GANGAPATH/AE/22-23/237 dated 16.06.2023
         4. AECOM-RODIC/BSRDCL/GANGAPATH/SPSCPL/23-24/0113 dated 14.06.2023
         5. SPSCPL/BSRDCL/GANGAPATH/AE/22-23/232 dated 06.06.2023

    2. Ref: -1. Our  Letter  No'  SPS/P-345/096 Dt'  02'02 2023'
             2. Our  Letter  No SPS/P-345/1OO Dt 10  02 2023'
             3: Our  Letter  No SPS/P-3 45t105 Dt 17  '02'2023'
             4. Our  Letter  No SPS/P-3 451119  Dl 11'04'2023'

    3. References: 1. Our LOA Acceptance Letter No SPS / P – 354 / 002 dated 19.03.2024
                   2. Our Earlier Letter No SPS / P – 354 / 004 dated 25.04.2024, for submission of JV Agreement
                   3. Your Letter No B / W .148 / 1 / 99723 / EPC / WA - Br. Dated 04.05.2024 for Observations in JV Agreement
                   4. Our Earlier Letter No SPS / P – 354 / 009 dated 20.05.2024, for submission of Amended PBG
                   5. Our Earlier Letter No SPS / P – 354 / 010 dated 24.05.2024, for submission of Penalty Amount
                   6. Your Letter No B / W .148 / 1 / 99723 / EPC / WA - Br. Dated 27.05.2024 for Revised Penalty Amount
                   7. Our Earlier Letter No SPS / P – 354 / 011 dated 27.05.2024, for Submission of Original Amended JV Agreement
                   8. Our Earlier Letter No SPS / P – 354 / 013 dated 29.05.2024, for Signing of Agreement
                   9. Your Letter No B / W .148 / 1 / 99723 / EPC / WA - Br. dated 29.05.2024 for Registered JV Agreement
                  10. Your Letter No B / W .148 / 1 / 99723 / EPC / WA - Br./ 008 dated 30.05.2024 for Signing of Agreement 

    3. date : Strictly follow 'dd/mm/yyyy' format. Convert any other date formats encountered to this standard format.

    4. If “subject or Sub or sub” field in the PDF has some underlined or bold text then  that’s the subject we need to extract otherwise whole text under the “Sub” field would be subject for the application and subject : Include the whole subject section usually starts with Subject: , Sub: , Sub-

    5. Format if you need to format the text and extract the data from it as above mentioned  

    6. Also, please re-check the result twice before returning the response to minimize mistakes.

    Example for References no:-


    Text: ${text}`;

    try {
        const response = await openai.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "ft:gpt-3.5-turbo-1106:personal:002:9qxghOlU",
            temperature: 0.2,
            response_format: { type: "json_object" },
        });

        return response;
    } catch (error) {
        console.error("Error extracting information from OpenAI:", error);
        return null;
    }
};

module.exports = processOpenAI;
