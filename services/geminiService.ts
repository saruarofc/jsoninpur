
import { GoogleGenAI, Type } from "@google/genai";
import { Question, Subject } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const questionSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      text: { type: Type.STRING, description: "The text of the question" },
      options: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            isCorrect: { type: Type.BOOLEAN, description: "Whether this option is marked as correct" }
          },
          required: ["text", "isCorrect"]
        }
      },
      subject: { 
        type: Type.STRING, 
        description: "The subject category (Physics, Chemistry, Biology, Mathematics, English, Bengali, General Knowledge, Other)" 
      },
      explanation: { 
        type: Type.STRING, 
        description: "If an explanation is not present in the text, you MUST generate a clear and concise one based on your knowledge." 
      },
      imageUrl: { 
        type: Type.STRING, 
        description: "Optional: If there is a diagram or specific image reference in the question, describe it here or leave as empty string." 
      }
    },
    required: ["text", "options", "subject", "explanation"]
  }
};

const MAX_RETRIES = 3;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export interface ParseResult {
  questions: Partial<Question>[];
  rawJson: string;
}

export const parseExamFile = async (
  base64Data: string, 
  mimeType: string, 
  onRetry?: (attempt: number) => void
): Promise<ParseResult> => {
  let attempts = 0;

  while (attempts < MAX_RETRIES) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            parts: [
              { text: "Extract all MCQ questions from this file. For each question: 1. Identify text and options. 2. Identify the correct answer. 3. Categorize the subject. 4. IMPORTANT: If the file does not contain an explanation for the answer, you MUST create a helpful, high-quality explanation yourself. 5. If a question relies on a diagram visible in the file, note it in the 'imageUrl' field as a descriptive placeholder." },
              { inlineData: { mimeType: mimeType, data: base64Data.split(',')[1] || base64Data } }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: questionSchema,
          temperature: 0.2,
        }
      });

      const jsonStr = response.text;
      if (!jsonStr) throw new Error("Empty response from AI");
      
      const parsed = JSON.parse(jsonStr);
      if (!Array.isArray(parsed)) throw new Error("Response is not an array");

      const questions = parsed.map((q: any) => ({
        ...q,
        id: Math.random().toString(36).substr(2, 9),
        createdAt: Date.now(),
        options: (q.options || []).map((opt: any) => ({
          ...opt,
          id: Math.random().toString(36).substr(2, 9)
        }))
      }));

      return {
        questions,
        rawJson: jsonStr
      };
    } catch (error) {
      attempts++;
      if (attempts >= MAX_RETRIES) {
        throw new Error(`Failed to parse file after ${MAX_RETRIES} attempts.`);
      }
      if (onRetry) onRetry(attempts);
      await sleep(1500 * attempts);
    }
  }
  throw new Error("Maximum retries exceeded");
};

