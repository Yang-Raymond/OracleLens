/**
 * @file imageAnalyzer.js
 * @description Utility to analyze League of Legends scoreboard images using Google Gemini AI.
 */

require('dotenv').config();
const { GoogleGenAI } = require("@google/genai");
const fs = require("node:fs");

/**
 * Analyzes a League of Legends scoreboard image.
 * @param {string} imagePath - The path to the image file.
 * @param {string} [mimeType='image/jpeg'] - The MIME type of the image.
 * @returns {Promise<Array<{username: string, kills: number, deaths: number, assists: number, win: boolean}>|null>} The analyzed data or null if not enough information.
 */
async function LeagueScoreboardAnalyzer(imagePath, mimeType = 'image/jpeg') {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const base64ImageFile = fs.readFileSync(imagePath, {
        encoding: "base64",
    });

    const contents = [
        {
            inlineData: {
                mimeType: mimeType,
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
        model: "gemini-3.5-flash-lite",
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
    try {
        return validateAnalysis(JSON.parse(jsonText));
    } catch (parseError) {
        console.error('Failed to parse AI response as JSON:', parseError.message);
        console.error('Raw response text:', text);
        return null;
    }
}

const FORBIDDEN_NAMES = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Validates the parsed AI output. Returns a sanitized array or null if invalid.
 * @param {unknown} data
 * @returns {Array<{username: string, kills: number, deaths: number, assists: number, win: boolean}>|null}
 */
function validateAnalysis(data) {
    if (!Array.isArray(data) || data.length < 1 || data.length > 10) return null;
    const isCount = (n) => Number.isInteger(n) && n >= 0;
    const result = [];
    for (const p of data) {
        if (!p || typeof p !== 'object' || typeof p.username !== 'string') return null;
        const username = p.username.trim();
        if (username.length === 0 || username.length > 32 || FORBIDDEN_NAMES.has(username)) return null;
        if (!isCount(p.kills) || !isCount(p.deaths) || !isCount(p.assists) || typeof p.win !== 'boolean') return null;
        result.push({ username, kills: p.kills, deaths: p.deaths, assists: p.assists, win: p.win });
    }
    return result;
}

module.exports = { LeagueScoreboardAnalyzer };

