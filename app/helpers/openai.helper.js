const OpenAIApi = require("openai");

const openai = new OpenAIApi({ apiKey: process.env.OPENAI_API_KEY });

const processOpenAI = async (text) => {    
    console.log(text);
    

    const prompt = `   

    NOTE:- Given the text extracted from the first page of a formal letter using Amazon Textract, transform it into a polished and professional letter format. The output should adhere to formal business communication standards, ensuring the following:

    1 Proper alignment: Ensure consistent margins and alignment for all elements, such as sender's and recipient's addresses, date, reference, salutation, body, and signature.
    2 Structured layout: Organize the letter with clear sections, including:
       - Sender’s details
       - Recipient’s details
       - Date
       - Reference line (e.g., Ref.:1. Our  Letter  No SPS/P-345/096  Dt  02'02 2023' ,{Ref: 1. SPSCPL/BSRDCL/GANGAPATH/AE/22-23/253 dated 18.07.2023
         2. AECOM-RODIC/BSRDCL/GANGAPATH/SPSCPL/23-24/0118 dated 27.06.2023
         3. SPSCPL/BSRDCL/GANGAPATH/AE/22-23/237 dated 16.06.2023
         4. AECOM-RODIC/BSRDCL/GANGAPATH/SPSCPL/23-24/0113 dated 14.06.2023
         5. SPSCPL/BSRDCL/GANGAPATH/AE/22-23/232 dated 06.06.2023})
       - Subject line
       - Salutation
       - Body paragraphs with proper paragraphing
       - Closing/sign-off
       - Signature placeholders
     3 Professional tone: Maintain a formal tone with clear and concise language.
     4 Readability enhancements: Ensure appropriate paragraphing, spacing, and indentation for a clean and professional appearance.
     5 Aesthetic considerations: Apply typographic consistency, such as bold for headings and appropriate emphasis, to enhance visual appeal.

    “AFTER PROPER FORMATTING PLEASE PROCEED FURTHER”
    
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
    "subject": "",
    "letter_type:"",
    }

    Rules and Clarifications :- 
    1. letter_number: Include only the first exact alphanumeric code in the specified format found in the document header. Ignore any prefixes like "Ref:" or "No:". Example: SPSCPL/BSRDCL/GANGAPATH/22-23/109 , AECOM-RODIC/BSRDCL/GANGAPATH/SPSCPL/23-24/0127.
    
    2. references : Include only valid reference numbers found after the Letter Number. Exclude any labels or prefixes. Multiple references should be comma-separated without spaces Example: SPSCPL/BSRDCL/GANGAPATH/22-23/110,AE/TRUMPET/TL/EPC/2023/001.
    There could also be a scenario where the Ref: numbers can be number wise 1.,2.,3.,4. etc and could end with date Example(date 18.07.2023) or start with some text  you should only extract Ref: number and make sure not to inculued date or any prefixes 
    
    Here are sample example that might comes :-
     
    Case A
    2a. Ref: 1. SPSCPL/BSRDCL/GANGAPATH/AE/22-23/253 dated 18.07.2023
         2. AECOM-RODIC/BSRDCL/GANGAPATH/SPSCPL/23-24/0118 dated 27.06.2023
         3. SPSCPL/BSRDCL/GANGAPATH/AE/22-23/237 dated 16.06.2023
         4. AECOM-RODIC/BSRDCL/GANGAPATH/SPSCPL/23-24/0113 dated 14.06.2023
         5. SPSCPL/BSRDCL/GANGAPATH/AE/22-23/232 dated 06.06.2023

     Output:- SPSCPL/BSRDCL/GANGAPATH/AE/22-23/253,AECOM-RODIC/BSRDCL/GANGAPATH/SPSCPL/23-24/0118,SPSCPL/BSRDCL/GANGAPATH/AE/22-23/237,AECOM-RODIC/BSRDCL/GANGAPATH/SPSCPL/23-24/0113,SPSCPL/BSRDCL/GANGAPATH/AE/22-23/232


    Case B
    2b. Ref: 1. Our  Letter  No SPS/P-345/096  Dt  02'02 2023'
             2. Our  Letter  No SPS/P-345/1OO  Dt 10  02 2023'
             3: Our  Letter  No SPS/P-3 45t105 Dt 17  '02'2023'
             4. Our  Letter  No SPS/P-3 451119 Dl 11'04'2023'
    
    Output:- SPS/P-345/096,SPS/P-345/1OO,SPS/P-3 45t105,SPS/P-3 451119

    Case c
    2c. References: 1. Our LOA Acceptance Letter No SPS / P – 354 / 002 dated 19.03.2024
                   2. Our Earlier Letter No SPS / P – 354 / 004 dated 25.04.2024, for submission of JV Agreement
                   3. Your Letter No B / W .148 / 1 / 99723 / EPC / WA - Br. Dated 04.05.2024 for Observations in JV Agreement
                   4. Our Earlier Letter No SPS / P – 354 / 009 dated 20.05.2024, for submission of Amended PBG
                   5. Our Earlier Letter No SPS / P – 354 / 010 dated 24.05.2024, for submission of Penalty Amount
                   6. Your Letter No B / W .148 / 1 / 99723 / EPC / WA - Br. Dated 27.05.2024 for Revised Penalty Amount

    Output:- SPS/P–354/002,SPS/P–354,B/W.148/1/99723/EPC/WA,SPS/P–354/009,SPS/P–354/010,B/W.148/1/99723/EPC/WA
    
    Case c
    2d. Ref: 1.   LOA. No. NH-12014/17/2023-RO Patna dated- 15.02.2024
             2.   Appointment Date- Letter No.: NH-12014/17/2023-RO Patna (218701)-162 Dtd. 01.05.2024
             3.   Our Office letter no. SPS/P-353/38, Dtd: 04.05.2024
             4.   Your Office letter NH-12014/17/2023-RO Patna (218701)-173, Dtd: 27.05.2024
             5.   Our Office letter no. SPS/SITE/DS6L/019, Dtd: 05.06.2024
             6.   Your Office letter NH-12014/17/2023-RO Patna (218701)-185, Dtd: 25.06.2024
             7.   Our Office letter no. SPS/SITE/DS6L/042, Dtd: 11.07.2024

     Output:-NH-12014/17/2023-RO Patna,NH-12014/17/2023-RO Patna (218701)-162,SPS/P-353/38,NH-12014/17/2023-RO Patna (218701)-173,SPS/SITE/DS6L/019,NH-12014/17/2023-RO Patna (218701)-185,SPS/SITE/DS6L/042


    Case E
    2e Ref: iii. This office letter No. 168 dated 15.05.2024
            iv. M/s S.P Singla Constructions Pvt Ltd. Letter No. SPS/SITE/DS6L/75 dated 28.09.2024.

    Output:- SPS/SITE/DS6L/75
                
    Case F
    2f Ref: i. PIU Digha letter no RW/PAT/PIU-Digha/PAT/SPS/24-24 dated:20.08.2024
            ii. PIU Digha letter no RW/PAT/PIU-Digha/PAT/SPS/24-47 dated:24.10.2024
    
    Output:- RW/PAT/PIU-Digha/PAT/SPS/24-24,RW/PAT/PIU-Digha/PAT/SPS/24-47
    

    {
       Some Exrta points To Be Note Before returning the References :-
       Expected result for references should be as follows

       1. References should not include standalone numbers like 1., 2., 3., unless they are directly followed by a valid reference number. Exclude accompanying dates, such as dated 18.07.2023, or prefixes like "Our Letter No".

       2. Extract only valid reference numbers that appear after the markers Ref:, ref:, or References: (case-insensitive). Reference numbers must exclude prefixes, labels, or dates. Multiple references should be comma-separated without spaces.
        Example:
        Input: SPSCPL/BSRDCL/GANGAPATH/22-23/110, AE/TRUMPET/TL/EPC/2023/001
        Output: SPSCPL/BSRDCL/GANGAPATH/22-23/110,AE/TRUMPET/TL/EPC/2023/001

        3. Please make trim the spaces References if any (eg-> B / W .148 / 1 / 99723 / EPC / WA -> B/W.148/1/99723/EPC/WA) 
        4. References is the most important which should be carefully returned.
        5. Make sure to pick only references starts with (Ref:-,ref:-,references:-,References:-) 
        6. Never retrun result if there is no Ref or ref or References has this -> (Ref.: Your Quotation dated 15.04.2022 this is not a valid, Youremailofferdated08.04.2024)

        
    }
                    
    2g Strictly validate references by passing them through a rigorous filter, ensuring they meet the precise criteria and conditions outlined earlier. Cross-check every reference meticulously against the stated requirements to confirm compliance and eliminate discrepancies.


    3. date : Strictly follow 'dd/mm/yyyy' format. Convert any other date formats encountered to this standard format.

    4. If the feeded text in the "Subject" or "Sub" field contains underlined or bold text, ensure to extract that as the subject only. If no underlined or bold text is present, consider the entire text under the "Sub" field as the subject. The subject should typically include the entire section starting with "Subject:", "Sub:", or "Sub-"  Make sure to double-check everything for accuracy.

     4a: Subject to be picked up after first "- " i.e a dash and a with or without space excluding double quotes if it is there otherwise full sentence

        4b: **Subject Extraction Rules:**
        1. **When the subject starts with "- ":**
        - If the text contains a dash followed by a space (i.e., "- "), extract everything following that dash, excluding any surrounding quotes. Do **not** include the dash and space at the beginning.
        - Example:  
            - **Input**: "cum-Road Bridge at Patna on Ganga River on NH-139W in the state of Bihar on EPC mode- "Submission of Monthly Progress Report for the month of October 2024"  
            - **Extracted Subject**: "Submission of Monthly Progress Report for the month of October 2024"
            
        2. **When the text does not start with "- ":**
        - If the text contains any **bold** or **underlined** text, extract the bold or underlined portion as the subject.
        - Example:
            - **Input**: "Subject: **Progress Report for October 2024**" 
            - **Extracted Subject**: "Progress Report for October 2024"
        
        3. **When no bold or underlined text is present:**
        - If no bold or underlined text exists and no dash is found, extract the **entire sentence** as the subject.
        - Example:
            - **Input**: "Sub: Monthly update on the status of the project"  
            - **Extracted Subject**: "Monthly update on the status of the project"

        4. **Additional Guidelines:**
        - Always ensure that the text starts with either "Subject:", "Sub:", or "Sub-" for proper extraction.
        - Make sure to exclude any surrounding **quotes** when extracting the subject.



    5. Letter Type - if Letter No starts with SPS then it's an outgoing document, otherwise it’s an incoming document.

    6. Format if you need to format the text and extract the data from it as above mentioned  

    7. Also, please re-check the result twice before returning the response to minimize mistakes.

    


    GOOD Exmaples for References:-
    1. NH-12014/17/2023-ROPatna(218701)-162,NH-12014/17/2023-ROPatna(218701)-173,SPS/P-353/38,NH-12014/17/2023-ROPatna(218701)-185,SPS/SITE/DS6L/019,NH-12014/17/2023-ROPatna(218701)-189,SPS/SITE/DS6L/042,NH-12014/17/2023-ROPatna(218701)-191
    2. RW/PAT/PIU-Digha/PAT/SPS/24
    3. 1443NBPDCL,430NBPDCL
    4. SPS/P-353/44
    5. SPS/SITE/DS6L/08,SPS/SITE/DS6L/022
    6. NH-12014/17/2023-ROPatna(218701)


    BAD Exmaples References:-
    7. "Your Quotation dated 15.04.2022"
    1. EPCContractAgreementdated26.02.2024,RW/PAT/PIU-Digha/PAT/SPS/24-03dated24.06.2024
    2. ProjectDirector/Morth'sletterNo.RW/PAT/PIU-Digha/PAT/SPS/24-42
    3. 1,2,3,4,5,6,7,8
    4. i,ii,iii,iv,V,vi,vii,viii,ix,X
    5. ShowcausenoticeoftheLabourEnforcementofficer(Central)dated17.12.2024
    6. MoRT&HLetterNo.:NH-12014/17/2023-ROPatna(218701)--162

   Here is the text:  ${text}.
   `;

    try {
        const response = await openai.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "gpt-3.5-turbo",
            temperature: 0,
            response_format: { type: "json_object" },
        });
        console.log(response.choices[0].message.content);
        
        return response;
    } catch (error) {
        console.error("Error extracting information from OpenAI:", error);
        return null;
    }
};

module.exports = processOpenAI;
