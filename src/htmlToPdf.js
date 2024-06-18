const pdf = require('html-pdf');

const createHtmlContent = (chatResponse) => {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Premium Solution</title>
            <link rel='icon' href="./logo.png"/>
            <style>
                body { font-family: Arial, sans-serif; padding: 8px; }
                h1 { color: darkblue; }
            </style>
        </head>
        <body>
            <h1 style="text-align: center;">CheggSolutions - Thegdp</h1>
            <div style="width: 100%; display: flex; flex-direction: column; justify-content: start;">
            ${chatResponse}
            </div>
        </body>
        </html>
    `;
};

const htmlToPdf = (htmlContent, userId, callback) => {
    const options = { format: 'Letter' };

    pdf.create(htmlContent, options).toFile(`./Solutions/${userId}/Premium Solution-${Date.now()}.pdf`, (err, res) => {
        if (err) return console.log(err);
        console.log(`Sent to userId: ${userId}, fileName: ${res.filename}`);
        callback(res.filename);
    });
};

module.exports = { createHtmlContent, htmlToPdf };
