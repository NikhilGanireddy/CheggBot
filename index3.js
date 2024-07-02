const {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
} = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI("AIzaSyDw4N4S7XOk0wxPVmgnS9CkdbcCsCjfK8g");

const model = genAI.getGenerativeModel({
    model: "gemini-1.5-pro",
    systemInstruction: "Do not change any matter from the taken input. Just Take the given text and Generate the response in html tags code only Do not change Any matter/text. Generate the response only in HTML without body tag with neat formatting and wonderful and modern UI because I have already created a Html page with head and body tag I will just copy the generated response and paste them in my body tag, so generate the code in div container. The math or chemistry terms should be in a way that the user can copy and paste them in the math or given tools. Do not format any equations, numbers, formula or etc. Just format thr UI. Explanations must be present for each and every step. The UI should be very modern looking and follow the styling of instagram . Also style it beautifully with inline-css\"",
});

const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 8192,
    responseMimeType: "text/plain",
};

async function run() {
    const chatSession = model.startChat({
        generationConfig,
        // safetySettings: Adjust safety settings
        // See https://ai.google.dev/gemini-api/docs/safety-settings
        history: [],
    });

    const result = await chatSession.sendMessage("INSERT_INPUT_HERE");
    console.log(result.response.text());
}

run();
