import { GoogleGenAI, Type } from "@google/genai";
import { AZ104Question, ExtractionResult, GroundingSource, ExtractedQuestion } from "./types";

const EXTRACTION_PROMPT = `
You are the "AZ-104 Concept Validation and Logic Extraction Engine." Your goal is to convert correctly answered AZ-104 quiz items into valid, reusable logic patterns rooted in official Microsoft Learn documentation and optimized for NotebookLM slide generation.

### TASK:
For each correctly answered input item:
1. **Active Documentation Retrieval**: Use Google Search tool to query learn.microsoft.com for the relevant AZ-104 objective.
2. **Principle Validation**: Identify the foundational Azure principle (e.g., control plane vs. data plane, statefulness, regional availability).
3. **Abstraction into Core Rules**: Abstract the principle into a topic-neutral "Core Rule".
4. **Reinforcement Synthesis**: Generate a non-technical analogy, an analogous foundational concept, and a common confusion.

### OUTPUT STRUCTURE (JSON):
- **domain**: The specific AZ-104 domain name.
- **blocks**: Array of insight objects including foundationalRule, whyItWorks, analogy, analogousFoundationalConcept, commonConfusion, examEliminationCue, and memoryHook.
`;

const CLEANER_PROMPT = `
You are the "AZ-104 Clean Answer Extractor." 
### TASK:
Analyze the provided data (raw text or document). 
Extract ONLY the questions that were answered CORRECTLY. 
Format them into a clean JSON array. 
For each item, include the question text, the correct answer, and a brief official explanation.
Do not include questions with incorrect answers.
Identify the correct answer based on markings like "Correct Answer:", bolded options, or explanation notes.
Max 6 questions per extraction.
`;

export const cleanAndExtractAnswers = async (rawText: string, pdfBase64?: string): Promise<ExtractedQuestion[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
  const model = 'gemini-3-flash-preview';

  const parts: any[] = [{ text: CLEANER_PROMPT }];
  
  if (pdfBase64) {
    parts.push({
      inlineData: {
        mimeType: 'application/pdf',
        data: pdfBase64
      }
    });
  } else {
    parts.push({ text: `RAW INPUT DATA:\n${rawText}` });
  }

  const response = await ai.models.generateContent({
    model,
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            text: { type: Type.STRING },
            correctAnswer: { type: Type.STRING },
            explanation: { type: Type.STRING }
          },
          required: ["text", "correctAnswer", "explanation"]
        }
      }
    }
  });

  const text = response.text || '[]';
  return JSON.parse(text) as ExtractedQuestion[];
};

export const processInsights = async (questions: AZ104Question[]): Promise<ExtractionResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
  const model = 'gemini-3-pro-preview';
  
  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        { text: EXTRACTION_PROMPT },
        { text: `INPUT QUESTIONS TO PROCESS:\n${JSON.stringify(questions)}` }
      ]
    },
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          domain: { type: Type.STRING },
          blocks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                foundationalRule: { type: Type.STRING },
                whyItWorks: { type: Type.STRING },
                analogy: { type: Type.STRING },
                analogousFoundationalConcept: { type: Type.STRING },
                commonConfusion: { type: Type.STRING },
                examEliminationCue: { type: Type.STRING },
                memoryHook: { type: Type.STRING }
              },
              required: ["foundationalRule", "whyItWorks", "analogy", "analogousFoundationalConcept", "commonConfusion", "examEliminationCue", "memoryHook"]
            }
          }
        },
        required: ["domain", "blocks"]
      }
    }
  });

  const sources: GroundingSource[] = [];
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (groundingChunks) {
    groundingChunks.forEach((chunk: any) => {
      if (chunk.web && chunk.web.uri && chunk.web.title) {
        sources.push({ title: chunk.web.title, uri: chunk.web.uri });
      }
    });
  }

  const textOutput = response.text || '{}';
  const jsonStr = textOutput.replace(/```json\n?|\n?```/g, '').trim();
  
  try {
    const result = JSON.parse(jsonStr) as ExtractionResult;
    return { ...result, sources };
  } catch (err) {
    throw new Error("Invalid structure returned from AI. Try a smaller batch.");
  }
};