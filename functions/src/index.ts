import { onCall, HttpsError } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

admin.initializeApp();

setGlobalOptions({ maxInstances: 10, region: "us-central1" });

const geminiApiKey = defineSecret("GEMINI_API_KEY");

// Import mammoth
const mammoth = require("mammoth");

export const parseTripDocument = onCall({ secrets: [geminiApiKey] }, async (request) => {
  // Ensure the user is authenticated
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
  }

  const { base64Data, storageUri } = request.data;
  if (!base64Data && !storageUri) {
    throw new HttpsError("invalid-argument", "Provide either 'base64Data' or 'storageUri'.");
  }

  let docBuffer: Buffer;

  try {
    if (base64Data) {
      docBuffer = Buffer.from(base64Data, "base64");
    } else {
      // Fetch from Firebase Storage URI
      logger.info(`Fetching file from storage: ${storageUri}`);
      if (storageUri.startsWith("gs://")) {
        const bucket = admin.storage().bucket();
        const filePath = storageUri.replace(/gs:\/\/[^\/]+\//, "");
        const file = bucket.file(filePath);
        const [downloadBuffer] = await file.download();
        docBuffer = downloadBuffer;
      } else {
        // Assume it's a direct https URL
        const response = await fetch(storageUri);
        if (!response.ok) {
          throw new Error(`Failed to fetch file from URL: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        docBuffer = Buffer.from(arrayBuffer);
      }
    }
  } catch (error: any) {
    logger.error("Failed to read document source file", error);
    throw new HttpsError("internal", `Failed to read document file: ${error.message}`);
  }

  // Extract raw text using mammoth
  let extractedText = "";
  try {
    const result = await mammoth.extractRawText({ buffer: docBuffer });
    extractedText = result.value;
    logger.info(`Mammoth successfully extracted ${extractedText.length} characters.`);
  } catch (error: any) {
    logger.error("Failed to extract text from DOCX using mammoth", error);
    throw new HttpsError("internal", `Failed to parse Word document: ${error.message}`);
  }

  if (!extractedText || extractedText.trim().length === 0) {
    throw new HttpsError("invalid-argument", "The provided Word document contains no readable text.");
  }

  const apiKey = geminiApiKey.value();
  if (!apiKey) {
    throw new HttpsError("failed-precondition", "Gemini API key is not configured in Firebase secrets.");
  }

  // Construct Gemini API call
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const prompt = `
Analyze the following travel itinerary text and extract a list of all events, flights, hotel stays, restaurant reservations, activities, and transportations.

Itinerary text:
"""
${extractedText}
"""

Return a JSON array of events. Each event object must strictly match the following schema:
- title: string (the name of the event, activity, or flight number, e.g. "Flight UA123" or "Checking into Hilton")
- type: string (must be exactly one of: 'flight', 'hotel', 'restaurant', 'activity', 'other')
- date: string (the date in YYYY-MM-DD format. If date is not specified, make a reasonable guess based on the sequence of days, but always output YYYY-MM-DD format)
- startTime: string (the start time in HH:MM format, 24-hour clock, e.g. "14:30" or "09:00", omit if not specified)
- endTime: string (the end time in HH:MM format, omit if not specified)
- location: string (the city, name of hotel, or address, omit if not specified)
- bookingReference: string (any confirmation code, PNR, booking number, omit if not specified)
- latitude: number (approximate coordinates of the location or airport, omit if not specified)
- longitude: number (approximate coordinates of the location or airport, omit if not specified)

Return ONLY a raw JSON array. Do not include markdown code block syntax (like \`\`\`json ... \`\`\`), do not write introductory text, and do not write explanations. The output must be directly parseable as JSON.
`;

  try {
    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      logger.error("Gemini API call failed", errText);
      throw new Error(`Gemini API error: ${response.statusText} (${errText})`);
    }

    const resJson = await response.json();
    const candidateText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      logger.error("Empty response from Gemini API", resJson);
      throw new Error("Empty response received from Gemini API.");
    }

    let cleanJsonText = candidateText.trim();
    if (cleanJsonText.startsWith("```")) {
      cleanJsonText = cleanJsonText.replace(/^```json\s*/, "").replace(/```$/, "").trim();
    }

    const events = JSON.parse(cleanJsonText);
    if (!Array.isArray(events)) {
      throw new Error("LLM output is not a JSON array.");
    }

    logger.info(`Extracted ${events.length} events from document.`);
    return { success: true, events };
  } catch (error: any) {
    logger.error("Failed to parse and extract itinerary details using Gemini", error);
    throw new HttpsError("internal", `Itinerary extraction failed: ${error.message}`);
  }
});
