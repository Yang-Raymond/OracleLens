/**
 * @file imageAnalyzer.js
 * @description Utility to analyze League of Legends scoreboard images using Google Gemini AI.
 */

const { GoogleGenAI } = require("@google/genai");
const fs = require("node:fs");

/**
 * Analyzes a League of Legends scoreboard image.
 * @param {string} imagePath - The path to the image file.
 * @returns {Promise<Array<{username: string, kills: number, deaths: number, assists: number, win: boolean}>|null>} The analyzed data or null if not enough information.
 */
async function LeagueScoreboardAnalyzer(imagePath) {
    const ai = new GoogleGenAI({});
    const base64ImageFile = fs.readFileSync(imagePath, {
        encoding: "base64",
    });

    const contents = [
        {
            inlineData: {
                mimeType: "image/jpeg",
                data: base64ImageFile,
            },
        },
        {
            text: `I will give you an image of a League of Legends scoreboard. Analyze the image and respond in the following json format:
[{
    "username": string,
    "kills": number,
    "deaths": number,
    "assists": number,
    "win": boolean
}]

If you do not have enough information or if the image doesn't look like a League of Legends scoreboard respond with "Not enough information"` },
    ];

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: contents,
    });

    fs.unlinkSync(imagePath);

    const text = response.text;
    
    // Extract JSON from the response (remove markdown code blocks if present)
    let jsonText = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
        jsonText = jsonMatch[1].trim();
    }
    
    // Check if the response indicates not enough information
    if (jsonText.toLowerCase().includes("not enough information")) {
        return null;
    }
    
    // Parse and return the JSON array
    return JSON.parse(jsonText);
}

module.exports = { LeagueScoreboardAnalyzer };

