require('dotenv').config();
const {MongoClient, GridFSBucket} = require('mongodb');
const TelegramBot = require('node-telegram-bot-api');
const pdf = require('html-pdf');
const OpenAI = require("openai");
const fs = require('fs');
const stream = require('stream');
const puppeteer = require('puppeteer');
const {
    GoogleGenerativeAI, HarmCategory, HarmBlockThreshold,
} = require("@google/generative-ai");

// Gemini-api
const genAI = new GoogleGenerativeAI("AIzaSyDw4N4S7XOk0wxPVmgnS9CkdbcCsCjfK8g");
const model = genAI.getGenerativeModel({
    model: "gemini-1.5-pro",
    systemInstruction: "Do not change any matter from the taken input. Just Take the given text and Generate the response in html tags code only Do not change Any matter/text. Generate the response only in HTML without body tag with neat formatting and wonderful and modern UI because I have already created a Html page with head and body tag I will just copy the generated response and paste them in my body tag, so generate the code in div container. The math or chemistry terms should be in a way that the user can copy and paste them in the math or given tools. Do not format any equations, numbers, formula or etc. Just format thr UI. Explanations must be present for each and every step. The UI should be very modern looking and follow the styling of instagram . Also style it beautifully with inline-css\"",
});
const generationConfig = {
    temperature: 1, topP: 0.95, topK: 64, maxOutputTokens: 8192, responseMimeType: "text/plain",
};
const chatSession = model.startChat({
    generationConfig, // safetySettings: Adjust safety settings
    // See https://ai.google.dev/gemini-api/docs/safety-settings
    history: [],
});


// OpenAI API
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// MongoDB setup
const url = "mongodb+srv://nikhilganireddy:Kakatiya2021@cluster0.tdfpdad.mongodb.net/chatgpt-4-sample";
const client = new MongoClient(url);
const dbName = "telegramBotDB";

async function connect() {
    await client.connect();
    console.log('Connected to MongoDB');
    const db = client.db(dbName);
    const users = db.collection('users');
    const bucket = new GridFSBucket(db, {bucketName: 'pdfFiles'});
    return {db, users, bucket};
}

// Telegram Bot setup
const token = "6813317549:AAHzK5R0CxbczrOMKD75umxXCtxS0rDfhWc";
const bot = new TelegramBot(token, {polling: true});

// Other Constants
let imageURL;

// Inline Keyboard
const inlineKeyboard = {
    reply_markup: {
        inline_keyboard: [[{
            text: 'Check Prices',
            url: `https://t.me/CheggsolutionsHub_Unlock`
        }, {text: 'Buy Subscription', url: `https://t.me/CheggsolutionsHub_Unlock`}], [{
            text: "Contact Admin",
            url: `https://t.me/nikhilganireddy`
        }]]
    }
};

// Subscription Management
const checkSubscription = async (userId, userName) => {
    const {users} = await connect();
    const user = await users.findOne({userId});
    if (user && user.questionsRemaining <= 0) return `\n🔔 Attention, ${userName}! 🔔\n\nYour account currently has 0 questions available. Please consider purchasing additional questions to continue using CheggSolutionsHub.\n\nThank you for using CheggSolutionsHub! 🌟`
    if (user && user.questionsRemaining > 0) return `\n📚 Hello, ${userName}! 📚\n\nYou have ${user.questionsRemaining} questions remaining in your account.\n\nHappy solving with CheggSolutionsHub! 🌟`
    if (!user) return `\n🚫 Hello, ${userName}! 🚫\n\nYou have not yet subscribed. Please consider subscribing to access our solutions and enhance your learning experience.\n\nThank you for using CheggSolutionsHub! 🌟`
}

const decrementQuestionCount = async (userId, userName) => {
    const {users} = await connect();
    const user = await users.findOne({userId});
    if (!user) {
        return {
            allowed: false,
            message: `\n🚫 Hello, ${userName}! 🚫\n\nYou have not yet subscribed. Please consider subscribing to access our solutions and enhance your learning experience.\n\nThank you for using CheggSolutionsHub! 🌟`
        };
    }
    if (user.questionsRemaining <= 0) {
        return {
            allowed: false,
            message: `\n🔔 Attention, ${userName}! 🔔\n\nYour account currently has 0 questions available. Please consider purchasing additional questions to continue using CheggSolutionsHub.\n\nThank you for using CheggSolutionsHub! 🌟`
        };
    }
    await users.updateOne({userId}, {$inc: {questionsRemaining: -1}});
    return {allowed: true, questionsRemaining: user.questionsRemaining - 1};
}

const addSubscription = async (userId, questions) => {
    const {users} = await connect();
    await users.updateOne({userId}, {$set: {questionsRemaining: questions}}, {upsert: true});
}

const isCommand = (text) => {
    return text && text.startsWith('/');
};

const sendMessageToChatGPT = async (inputMessage, imageUrl) => {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o", messages: [{
                role: "system", content: [{
                    "type": "text",
                    "text": "You are a Chegg Expert with an experience of over 10+ years and you are here to give chegg solutions to the users.Your name is CheggMasterBot, created and developed by Nikhil Ganireddy(thegdp)." + "If the user greets you say who you are and tell who created you(Nikhil Ganireddy)." + "These are your rules:- " + "Please provide a step-by-step, in-depth comprehensive concise complete answer in a structured way without plagiarism, including the given data given in the question. Also, give me a separate explanation at the end of each step. All the following guidelines and rules must be followed strictly while generating the answer. " + "'1. Accuracy: Solutions must be entirely correct, and solve the problem flawlessly. All calculations should be error-free. The answer must align with the requirements of the question. " + "2. Cohesiveness: The solution must always maintain Cohesiveness " + "3. Concept: The solution should demonstrate a clear understanding of the underlying concepts involved in the problem. The chosen approach should be appropriate and logical. " + "4. Explanation: EVERY STEP MUST HAVE AN EXPLANATION AT THE ENDING. Solutions must be accompanied by step-by-step explanations, making them easy to follow. All variables, functions, and formulas used should be defined and explained for clarity. Also, give me a separate explanation at the end of each step. " + "5. Supporting statements: The solution must be accompanied by a supporting statement. Give me a supporting statement compulsorily for each step along with an explanation " + "6. Formula: Show every formulas used to solve the question and explain the terms in formula everytime a formula is used. " + "7. Calculations: Show every small calculation in detail " + "8. First step: The first step should contain a given and introduction step which gives an introduction about the topics being discussed in the solution for the above question. " + "9. Last step: The last step should contain a small final solution for the answer. " + "10. There shouldn't be anytypo errors " + "11. Double-check all the calculations " + "12. There must be no words like we,you,I, etc. " + "13. Structure the solution in the best understandable way for the student " + "14. Include all the formula along with explaining terms " + "15. Don't use the pronouns while answering and answer must look like written by human. " + "16. All the calculations must be accurate and show every minor calculations and conversions also. " + "17. There must be an explanation for each step at the bottom of the step. " + "18. I don't need any guidance for the question - I just need the complete perfect & exact answer for the given question. " + "19. Must mention the sub-subject and topic name at the top of the generated solution. " + "20. Recheck and recalculate all the calculations before generating the answer. " + "21. If the solution is from computer science neatly explain every code in a step by step manner with code and explanations for each step. the final solution should contain the whole final code. " + "22. The explanations step must be lengthy and detailed and should be present in each and every step'"
                }]
            }, {
                role: "user", content: [{
                    "type": "text", "text": `${inputMessage}`
                }, {
                    "type": "image_url", "image_url": {
                        "url": `${imageUrl}`
                    }
                }]
            }], temperature: 1, max_tokens: 4095, top_p: 1, frequency_penalty: 0, presence_penalty: 0,
        });

        const rawfile = response.choices[0].message.content.slice(7, -3);
        const newResponse = await chatSession.sendMessage(`${rawfile}`)
        return newResponse.response.text();
    } catch (error) {
        console.error("Error fetching the chat completion:", error);
    }
};

const sendMessageToChatGPTWithoutImage = async (inputMessage) => {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o", messages: [{
                role: "system", content: [{
                    "type": "text",
                    "text": "You are a Chegg Expert with an experience of over 10+ years and you are here to give chegg solutions to the users.Your name is CheggMasterBot, created and developed by Nikhil Ganireddy(thegdp)." + "If the user greets you say who you are and tell who created you(Nikhil Ganireddy)." + "These are your rules:- " + "Please provide a step-by-step, in-depth comprehensive concise complete answer in a structured way without plagiarism, including the given data given in the question. Also, give me a separate explanation at the end of each step. All the following guidelines and rules must be followed strictly while generating the answer. " + "'1. Accuracy: Solutions must be entirely correct, and solve the problem flawlessly. All calculations should be error-free. The answer must align with the requirements of the question. " + "2. Cohesiveness: The solution must always maintain Cohesiveness " + "3. Concept: The solution should demonstrate a clear understanding of the underlying concepts involved in the problem. The chosen approach should be appropriate and logical. " + "4. Explanation: EVERY STEP MUST HAVE AN EXPLANATION AT THE ENDING. Solutions must be accompanied by step-by-step explanations, making them easy to follow. All variables, functions, and formulas used should be defined and explained for clarity. Also, give me a separate explanation at the end of each step. " + "5. Supporting statements: The solution must be accompanied by a supporting statement. Give me a supporting statement compulsorily for each step along with an explanation " + "6. Formula: Show every formulas used to solve the question and explain the terms in formula everytime a formula is used. " + "7. Calculations: Show every small calculation in detail " + "8. First step: The first step should contain a given and introduction step which gives an introduction about the topics being discussed in the solution for the above question. " + "9. Last step: The last step should contain a small final solution for the answer. " + "10. There shouldn't be anytypo errors " + "11. Double-check all the calculations " + "12. There must be no words like we,you,I, etc. " + "13. Structure the solution in the best understandable way for the student " + "14. Include all the formula along with explaining terms " + "15. Don't use the pronouns while answering and answer must look like written by human. " + "16. All the calculations must be accurate and show every minor calculations and conversions also. " + "17. There must be an explanation for each step at the bottom of the step. " + "18. I don't need any guidance for the question - I just need the complete perfect & exact answer for the given question. " + "19. Must mention the sub-subject and topic name at the top of the generated solution. " + "20. Recheck and recalculate all the calculations before generating the answer. " + "21. If the solution is from computer science neatly explain every code in a step by step manner with code and explanations for each step. the final solution should contain the whole final code. " + "22. The explanations step must be lengthy and detailed and should be present in each and every step'"
                }]
            }, {
                role: "user", content: [{
                    "type": "text", "text": `${inputMessage}`
                },]
            }], temperature: 1, max_tokens: 4095, top_p: 1, frequency_penalty: 0, presence_penalty: 0,
        });

        const rawfile = response.choices[0].message.content.slice(7, -3);
        const newResponse = await chatSession.sendMessage(`${rawfile}`)
        return newResponse.response.text();
    } catch (error) {
        console.error("Error fetching the chat completion:", error);
    }
};

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userName = msg.from.first_name;
    const msgId = msg.message_id;

    function splitString(str) {
        if (str && str.length > 50) {
            return str.substring(0, 50);
        } else {
            return str;
        }
    }

    await bot.sendMessage(-1002226746384, `👤 User Information\n\nUsername: ${userName}\nUser ID: ${userId}\nChat ID: ${chatId}\n\n📩 Input Message\n\n${splitString(msg.text)}\n\n`);
    if (isCommand(msg.text)) {
        return;
    }

    const result = await decrementQuestionCount(userId, userName);
    if (!result.allowed) {
        await bot.sendMessage(chatId, result.message, {
            reply_to_message_id: msgId, reply_markup: inlineKeyboard.reply_markup
        });
        return;
    }

    if (msg.photo && result.allowed) {
        const numberOfPics = msg.photo.length;
        imageURL = await bot.getFileLink(msg.photo[numberOfPics - 1].file_id);
        console.log(imageURL);
        sendMessageToChatGPT(msg.text, imageURL)
            .then((response) => {
                const htmlContent = createHtmlContent(response);
                htmlToPdf(htmlContent, chatId, async (pdfFile) => {
                    await uploadPdfToMongoDB(pdfFile, chatId, msgId, userName, result.questionsRemaining);
                });
            });
    } else if (result.allowed) {
        sendMessageToChatGPTWithoutImage(msg.text)
            .then((response) => {
                const htmlContent = createHtmlContent(response);
                htmlToPdf(htmlContent, chatId, async (pdfFile) => {
                    await uploadPdfToMongoDB(pdfFile, chatId, msgId, userName, result.questionsRemaining);
                });
            });
    }
});

async function uploadPdfToMongoDB(filePath, chatId, msgId, userName, questionsRemaining) {
    const {bucket} = await connect();
    const readStream = fs.createReadStream(filePath);
    const uploadStream = bucket.openUploadStream(filePath);
    readStream.pipe(uploadStream);

    uploadStream.on('error', (error) => {
        console.error("Error uploading PDF to MongoDB:", error);
    });

    uploadStream.on('finish', async () => {
        const fileId = uploadStream.id;
        await sendPdfToUser(chatId, msgId, fileId);
        bot.sendMessage(chatId, `🚀 Hi ${userName}!\n\n📊 Questions remaining: ${questionsRemaining} 🤓`, {reply_to_message_id: msgId});
    });
}

async function sendPdfToUser(chatId, msgId, fileId) {
    const {bucket} = await connect();
    const downloadStream = bucket.openDownloadStream(fileId);
    const bufferStream = new stream.PassThrough();
    downloadStream.pipe(bufferStream);

    const chunks = [];
    bufferStream.on('data', (chunk) => {
        chunks.push(chunk);
    });
    bufferStream.on('end', () => {
        const fileBuffer = Buffer.concat(chunks);
        bot.sendDocument(chatId, fileBuffer, {}, {reply_to_message_id: msgId});
    });
}

function createHtmlContent(chatResponse) {
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
              
            </style>
        </head>
        <body>
            <div style=" display: flex;flex-direction: row;justify-content: space-between">
                <h1 style="color: darkblue;">CheggSolutions - Thegdp</h1>
                <h3 style="color: red;">Nikhil Ganireddy</h3>
            </div>
            <div style="width: 100%; display: flex;flex-direction: column;justify-content: start;">
            ${chatResponse}
            </div>
        </body>
        </html>
    `;
}

async function htmlToPdf(htmlContent, userId, callback) {
    const filePath = `/tmp/PremiumSolution-${userId}-${Date.now()}.pdf`;
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox']  // Disable sandbox for compatibility
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent);
    await page.pdf({path: filePath, format: 'A4'});
    await browser.close();
    callback(filePath);
}

bot.onText(/\/start@samplebotaibot/, async (msg) => {
    const chatId = msg.chat.id;
    const userName = msg.from.first_name;
    const msgId = msg.message_id;
    await bot.sendMessage(chatId, `\n🚀 Hi ${userName}!\n\n🤖 I am CheggMasterBot, created and developed by Nikhil Ganireddy (thegdp).\n\n❓ Please let me know the question you need help with, and a comprehensive, step-by-step solution will be provided! 📚✨`, {
        reply_to_message_id: msgId, reply_markup: inlineKeyboard.reply_markup
    });
});

bot.onText(/\/checksub@samplebotaibot/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userName = msg.from.first_name;
    const msgId = msg.message_id;
    const subscriptionMessage = await checkSubscription(userId, userName);
    await bot.sendMessage(chatId, `${subscriptionMessage}`, {
        reply_to_message_id: msgId, reply_markup: inlineKeyboard
    });
});

bot.onText(/\/add (\d+) (\d+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const msgId = msg.message_id;
    if (msg.from.id !== 1738520439) {
        await bot.sendMessage(chatId, "🚫 Unauthorized Access 🚫", {reply_to_message_id: msgId});
        return;
    }
    const userId = parseInt(match[1]);
    const questions = parseInt(match[2]);
    await addSubscription(userId, questions);
    await bot.sendMessage(chatId, `\n✨ Subscription Added! ✨\n\nYou now have ${questions} questions available.\n\n👤 User ID: ${userId}\n\nThank you for using CheggSolutionsHub! 🎉`, {
        reply_to_message_id: msgId, reply_markup: inlineKeyboard
    });
});

console.log("CheggMasterBot is running...");
