import { GoogleGenAI, Type } from "@google/genai";
import { RaidType, Location } from "../types";

// Always use the API key directly from process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function analyzeReport(
  description: string, 
  imagePart?: { data: string; mimeType: string }
): Promise<{
  category: RaidType;
  severity: 'low' | 'medium' | 'high';
  summary: string;
}> {
  if (!navigator.onLine) {
    return {
      category: RaidType.OTHER,
      severity: 'medium',
      summary: "Manual entry: Connection offline."
    };
  }

  try {
    const contents: any[] = [{ text: `Analyze the following report and potential image of federal officer activity to categorize it accurately.
    Report: "${description}"` }];

    if (imagePart) {
      contents.push({
        inlineData: {
          data: imagePart.data,
          mimeType: imagePart.mimeType
        }
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: contents },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: {
              type: Type.STRING,
              description: "The type of raid (Checkpoint, Workplace Raid, Residential Visit, Street Operation, Public Transport, Other Activity)",
            },
            severity: {
              type: Type.STRING,
              description: "The urgency of the situation (low, medium, high)",
            },
            summary: {
              type: Type.STRING,
              description: "A 1-sentence summary of what is happening.",
            },
          },
          required: ["category", "severity", "summary"],
        },
      },
    });

    const data = JSON.parse(response.text || "{}");
    return {
      category: (data.category as RaidType) || RaidType.OTHER,
      severity: (data.severity as any) || 'medium',
      summary: data.summary || "No summary available."
    };
  } catch (e) {
    console.warn("Analysis service unavailable:", e);
    return {
      category: RaidType.OTHER,
      severity: 'medium',
      summary: "Automated verification temporarily offline."
    };
  }
}

export async function getRightsGuidance(scenario: string): Promise<string> {
  if (!navigator.onLine) {
    return "• Remain silent.\n• Do not open the door without a warrant.\n• Do not sign anything without a lawyer.\n(Offline Mode)";
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Provide immediate "Know Your Rights" legal guidance for a civilian facing this situation: "${scenario}". 
      Focus on US constitutional rights regarding ICE and Border Patrol. Keep it concise and formatted with bullet points.`,
      config: {
        systemInstruction: "You are a legal rights advisor specializing in immigrant rights and civil liberties. Be objective, calm, and accurate."
      }
    });
    return response.text || "Seek legal counsel immediately.";
  } catch (e) {
    return "Error connecting to legal guidance service. Basic Rights: 1. You have the right to remain silent. 2. You do not have to open your door to agents without a judicial warrant.";
  }
}

export async function getNearbySupport(
  incidentLocation: Location, 
  userLocation: Location | null
): Promise<{
  text: string;
  links: { title: string; uri: string }[];
}> {
  if (!navigator.onLine) {
    return { text: "Search unavailable offline.", links: [] };
  }

  try {
    // Maps grounding is only supported in Gemini 2.5 series models.
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Find 3 closest immigrant support centers, legal aid non-profits, or community organizations near the coordinates: lat ${incidentLocation.lat}, lng ${incidentLocation.lng}. These are for people affected by federal officer activity. Briefly describe each and explain why they are useful.`,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: userLocation?.lat || incidentLocation.lat,
              longitude: userLocation?.lng || incidentLocation.lng
            }
          }
        }
      },
    });

    const text = response.text || "No nearby support found.";
    const links: { title: string; uri: string }[] = [];

    // Extracting Maps grounding chunks
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.maps) {
          links.push({
            title: chunk.maps.title || "View on Google Maps",
            uri: chunk.maps.uri
          });
        }
      });
    }

    return { text, links };
  } catch (e) {
    console.error("Maps grounding failed:", e);
    return { text: "Unable to retrieve nearby support resources at this time.", links: [] };
  }
}
