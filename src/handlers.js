const { connect } = require('./db');
const { sendMessageToChatGPT } = require('./chatgpt');
const { createHtmlContent, htmlToPdf } = require('./htmlToPdf');
const { inlineKeyboard } = require('./inlineKeyboard');

const handleIncomingMessage = async (bot, msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userName = msg.from.first_name;
    const msgId = msg.message_id;

    function splitString(str) {
        return (str && str.length > 50) ? str.substring(0, 50) : str;
    }

    await bot.sendMessage(-1002226746384, `👤 User Information\n\nUsername: ${userName}\nUser ID: ${userId}\nChat ID: ${chatId}\n\n📩 Input Message\n\n${splitString(msg.text)}\n\n`);

    if (isCommand(msg.text)) return;

    const result = await decrementQuestionCount(userId, userName);
    if (!result.allowed) {
        await bot.sendMessage(chatId, result.message, {
            reply_to_message_id: msgId,
            reply_markup: inlineKeyboard.reply_markup
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
                htmlToPdf(htmlContent, chatId, (pdfFile) => {
                    bot.sendDocument(chatId, pdfFile, {}, { reply_to_message_id: msgId });
                });
            })
            .then(() => {
                bot.sendMessage(chatId, `🚀 Hi ${userName}!\n\n📊 Questions remaining: ${result.questionsRemaining} 🤓`, { reply_to_message_id: msgId });
            });
    } else if (result.allowed) {
        sendMessageToChatGPT(msg.text)
            .then((response) => {
                const htmlContent = createHtmlContent(response);
                htmlToPdf(htmlContent, chatId, (pdfFile) => {
                    bot.sendDocument(chatId, pdfFile, {}, { reply_to_message_id: msgId });
                });
            })
            .then(() => {
                console.log(`Solution sent successfully to ${userName}`);
            })
            .then(() => {
                bot.sendMessage(chatId, ` \n\n\nQuestions remaining: ${result.questionsRemaining}`, { reply_to_message_id: msgId });
            });
    }
};

const handleStartCommand = async (bot, msg, inlineKeyboard) => {
    const chatId = msg.chat.id;
    const userName = msg.from.first_name;
    const msgId = msg.message_id;
    await bot.sendMessage(chatId, `\n🚀 Hi ${userName}!\n\n🤖 I am CheggMasterBot, created and developed by Nikhil Ganireddy (thegdp).\n\n❓ Please let me know the question you need help with, and a comprehensive, step-by-step solution will be provided! 📚✨`, {
        reply_to_message_id: msgId,
        reply_markup: inlineKeyboard.reply_markup
    });
};

const handleCheckSubscriptionCommand = async (bot, msg, inlineKeyboard) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userName = msg.from.first_name;
    const msgId = msg.message_id;
    const subscriptionMessage = await checkSubscription(userId, userName);
    await bot.sendMessage(chatId, `${subscriptionMessage}`, {
        reply_to_message_id: msgId,
        reply_markup: inlineKeyboard.reply_markup
    });
};

const handleAddSubscriptionCommand = async (bot, msg, match, inlineKeyboard) => {
    const chatId = msg.chat.id;
    const msgId = msg.message_id;
    if (msg.from.id !== parseInt("1738520439")) {
        await bot.sendMessage(chatId, "🚫 Unauthorized Access 🚫", { reply_to_message_id: msgId });
        return;
    }
    const userId = parseInt(match[1]);
    const questions = parseInt(match[2]);
    await addSubscription(userId, questions);
    await bot.sendMessage(chatId, `\n✨ Subscription Added! ✨\n\nYou now have ${questions} questions available.\n\n👤 User ID: ${userId}\n\nThank you for using CheggSolutionsHub! 🎉`, {
        reply_to_message_id: msgId,
        reply_markup: inlineKeyboard.reply_markup
    });
};

// Additional helper functions
const isCommand = (text) => text && text.startsWith('/');
const decrementQuestionCount = async (userId, userName) => {
    const { users } = await connect();
    const user = await users.findOne({ userId });
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
    await users.updateOne({ userId }, { $inc: { questionsRemaining: -1 } });
    return { allowed: true, questionsRemaining: user.questionsRemaining - 1 };
};

const checkSubscription = async (userId, userName) => {
    const { users } = await connect();
    const user = await users.findOne({ userId });
    if (user && user.questionsRemaining <= 0) {
        return `\n🔔 Attention, ${userName}! 🔔\n\nYour account currently has 0 questions available. Please consider purchasing additional questions to continue using CheggSolutionsHub.\n\nThank you for using CheggSolutionsHub! 🌟`;
    }
    if (user && user.questionsRemaining > 0) {
        return `\n📚 Hello, ${userName}! 📚\n\nYou have ${user.questionsRemaining} questions remaining in your account.\n\nHappy solving with CheggSolutionsHub! 🌟`;
    }
    return `\n🚫 Hello, ${userName}! 🚫\n\nYou have not yet subscribed. Please consider subscribing to access our solutions and enhance your learning experience.\n\nThank you for using CheggSolutionsHub! 🌟`;
};

const addSubscription = async (userId, questions) => {
    const { users } = await connect();
    await users.updateOne({ userId }, { $set: { questionsRemaining: questions } }, { upsert: true });
};

module.exports = {
    handleIncomingMessage,
    handleStartCommand,
    handleCheckSubscriptionCommand,
    handleAddSubscriptionCommand
};
