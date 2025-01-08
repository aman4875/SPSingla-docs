const pdfjsLib = require('pdfjs-dist');
const { createCanvas } = require('canvas');
const { PDFDocument } = require("pdf-lib");


const fontUrl = 'node_modules/pdfjs-dist/standard_fonts/';
pdfjsLib.GlobalWorkerOptions.standardFontDataUrl = fontUrl;
pdfjsLib.GlobalWorkerOptions.canvasFactory = {
    create(width, height) {
        const canvas = createCanvas(width, height);
        return {
            canvas,
            context: canvas.getContext('2d'),
        };
    },
    reset(canvasAndContext, width, height) {
        const { canvas } = canvasAndContext;
        canvas.width = width;
        canvas.height = height;
    },
    destroy(canvasAndContext) {
        const { canvas } = canvasAndContext;
        canvas.width = 0;
        canvas.height = 0;
    },
};
pdfjsLib.GlobalWorkerOptions.imageFactory = {
    create(width, height) {
        const img = new Image();
        img.width = width;
        img.height = height;
        return img;
    },
};

async function renderFirstPageToImage(data) {
    try {

        const pdfBuffer = await streamToBuffer(data);
        const uint8Array = new Uint8Array(pdfBuffer);
        const loadingTask = pdfjsLib.getDocument({
            data: uint8Array,
            standardFontDataUrl: fontUrl,
        });

        const pdfDocument = await loadingTask.promise;
        console.log(`PDF Loaded: ${pdfDocument.numPages} pages`);

        const firstPage = await pdfDocument.getPage(1);
        const scale = 3;
        const viewport = firstPage.getViewport({ scale });
        const { canvas, context } = pdfjsLib.GlobalWorkerOptions.canvasFactory.create(
            viewport.width,
            viewport.height
        );


        await firstPage.render({
            canvasContext: context,
            viewport: viewport,
        }).promise;


        const imageUrl = canvas.toDataURL();


        // const imageBuffer = canvas.toBuffer();
        // fs.writeFileSync('firstPage.png', imageBuffer); // Save as PNG file

        console.log('Genrated first page for PDF');

        // Return the image URL (Base64 string)
        return imageUrl;

    } catch (err) {
        console.error('Error rendering PDF page to image:', err);
        throw err;
    }
}

function streamToBuffer(stream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', chunk => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
    });
}

async function createPdfFromFirstPage(originalPdfData) {
    try {

        const firstPageImageUrl = await renderFirstPageToImage(originalPdfData);

        const pdfDoc = await PDFDocument.create();

        // Embed the image from the buffer
        image = await pdfDoc.embedPng(firstPageImageUrl);

        const { width, height } = image.scale(1)
        const page = pdfDoc.addPage([width, height]);
        page.drawImage(image, {
            x: 0,
            y: 0,
            width: width,
            height: height,
        });

        const pdfBytes = await pdfDoc.save();
        return pdfBytes
    } catch (err) {
        console.error('Error creating PDF from first page:', err);
        throw err;
    }
}

module.exports = createPdfFromFirstPage