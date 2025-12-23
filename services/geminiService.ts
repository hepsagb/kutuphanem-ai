import { GoogleGenAI, Type } from "@google/genai";
import { Book } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Uses Gemini to identify a book from an image (ISBN or Cover).
 */
export const scanBookImage = async (base64Image: string): Promise<{ isbn: string; title: string; author: string } | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-latest",
      contents: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image,
          },
        },
        {
          text: "Analyze this image. If there is a barcode, extract the ISBN. If there is a book cover or spine, read the Title and Author. Return a JSON object.",
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isbn: { type: Type.STRING, description: "The ISBN-13 or ISBN-10 if visible. Empty string if not found." },
            title: { type: Type.STRING, description: "The title of the book if visible." },
            author: { type: Type.STRING, description: "The author of the book if visible." },
          },
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    return null;
  } catch (error) {
    console.error("Error scanning book image:", error);
    return null;
  }
};

/**
 * Uses Gemini to find detailed book metadata based on a query (ISBN or Title).
 */
export const fetchBookDetails = async (query: string): Promise<Partial<Book> | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", // Good for reasoning/knowledge retrieval
      contents: `Find detailed metadata for the book matching this query: "${query}". 
      If it is an ISBN, look it up. If it is a title, find the best match.
      Return the data in Turkish language (Türkçe).
      Provide a visual description of the cover in 5 words for a placeholder.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            author: { type: Type.STRING },
            publisher: { type: Type.STRING },
            year: { type: Type.STRING },
            genre: { type: Type.STRING, description: "The main genre, e.g., Roman, Bilim Kurgu, Tarih" },
            isbn: { type: Type.STRING },
            coverDescription: { type: Type.STRING },
          },
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    return null;
  } catch (error) {
    console.error("Error fetching book details:", error);
    return null;
  }
};
