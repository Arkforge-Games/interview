
import { GoogleGenAI, Type } from "@google/genai";
import { 
  InterviewQuestion, 
  QuestionAnalysis, 
  ExperienceLevel, 
  SessionMode, 
  EducationLevel, 
  DrillType, 
  DrillBatchResult 
} from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

function parseModelJson(text: string | undefined): any {
  if (!text) return {};
  try {
    const cleanJson = text.replace(/```json\n?|```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (e) {
    console.error("JSON Parse Error. Raw text:", text);
    return {};
  }
}

export const generateInterviewQuestions = async (
  jobTitle: string,
  jd: string,
  cv: string,
  level: ExperienceLevel,
  years: string,
  language: string,
  weaknessContext?: string,
  excludedQuestions?: string[]
): Promise<InterviewQuestion[]> => {
  let instruction = `Task: Generate EXACTLY 10 interview questions for a ${jobTitle} position (${level}, ${years} years exp).`;
  
  if (weaknessContext) {
    instruction += `\nFOCUS ON WEAK AREAS: The candidate previously struggled with: ${weaknessContext}. Generate questions that drill these specific skills/scenarios.`;
  }
  
  if (excludedQuestions && excludedQuestions.length > 0) {
    instruction += `\nIMPORTANT: Do NOT repeat these questions: ${JSON.stringify(excludedQuestions.slice(0, 5))}.`;
  }

  const prompt = `${instruction}
    Context (JD): ${jd.slice(0, 1500)}
    Context (CV): ${cv.slice(0, 1500)}
    Language: ${language}
    Requirements:
    - 2 "Intro" questions
    - 4 "Experience" questions
    - 4 "Behavioral/Scenario" questions
    Output JSON format: [{"text": string, "category": string}]`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            category: { type: Type.STRING }
          }
        }
      }
    }
  });

  const raw = parseModelJson(response.text);
  const questions = Array.isArray(raw) ? raw : [];
  return questions.map((q: any, i: number) => ({
    id: `q-${i}-${Date.now()}`, // Unique ID
    text: q.text || "Question text unavailable",
    category: q.category || "General"
  }));
};

export const analyzeAnswer = async (
  audioBlob: Blob,
  question: string,
  jobTitle: string,
  jd: string,
  cv: string,
  level: ExperienceLevel
): Promise<QuestionAnalysis> => {
  const reader = new FileReader();
  const base64Audio = await new Promise<string>((resolve) => {
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(audioBlob);
  });

  const prompt = `As an Expert Interview Coach, evaluate this answer.
    Question: "${question}"
    Job: ${jobTitle} (${level})
    JD: ${jd.slice(0, 800)}
    Candidate CV: ${cv.slice(0, 800)}

    Requirements:
    1. expertCritique: Professional assessment of how an interviewer perceives the response.
    2. demoAnswer: A perfect response tailored to the JD/CV. Use <u>underscores</u> for personal project names or metrics so user knows to plug theirs in (e.g., "At <u>Company X</u>, I led <u>Project Y</u>").
    3. demoLogicRoadmap: A 3-5 step sequence of the ideal logic flow (e.g., ["1. State Problem", "2. Action Taken", "3. Result"]).
    4. logicUpgrades: Specific tips to improve the point-of-view, precision, and conciseness.
    5. vocabUpgrades: Better professional words.
    
    Scores (0-100): logicScore, concisenessScore, precisionScore.
    Output JSON.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: audioBlob.type || 'audio/webm', data: base64Audio } },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          overallScore: { type: Type.INTEGER },
          logicScore: { type: Type.INTEGER },
          concisenessScore: { type: Type.INTEGER },
          precisionScore: { type: Type.INTEGER },
          expertCritique: { type: Type.STRING },
          transcript: { type: Type.STRING },
          demoAnswer: { type: Type.STRING },
          demoLogicRoadmap: { type: Type.ARRAY, items: { type: Type.STRING } },
          vocabUpgrades: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                original: { type: Type.STRING },
                suggested: { type: Type.STRING }
              }
            }
          },
          logicUpgrades: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
    }
  });

  const raw = parseModelJson(response.text);
  
  // Safe default object ensuring all arrays exist
  return {
    overallScore: raw.overallScore || 0,
    logicScore: raw.logicScore || 0,
    concisenessScore: raw.concisenessScore || 0,
    precisionScore: raw.precisionScore || 0,
    expertCritique: raw.expertCritique || "Analysis unavailable.",
    transcript: raw.transcript || "",
    demoAnswer: raw.demoAnswer || "No demo answer generated.",
    demoLogicRoadmap: Array.isArray(raw.demoLogicRoadmap) ? raw.demoLogicRoadmap : [],
    vocabUpgrades: Array.isArray(raw.vocabUpgrades) ? raw.vocabUpgrades : [],
    logicUpgrades: Array.isArray(raw.logicUpgrades) ? raw.logicUpgrades : []
  };
};

export const createCoachChat = (
  result: QuestionAnalysis,
  topic: string,
  mode: SessionMode,
  language: string,
  eduLevel: EducationLevel
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `You are an expert Speech & Interview Coach. 
      The user just completed a ${mode} session about "${topic}" at a ${eduLevel} level.
      Their performance scores were: Logic: ${result.logicScore}, Conciseness: ${result.concisenessScore}, Precision: ${result.precisionScore}.
      Their transcript was: "${result.transcript}".
      Provide encouraging, specific, and professional advice. Keep responses concise and conversational in ${language}.`
    }
  });
};

export const generateDrillChallenges = async (
  type: DrillType,
  count: number,
  language: string,
  contextTopic: string,
  eduLevel: EducationLevel
): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Generate ${count} short, challenging speech prompts for a "${type}" drill.
    Topic Context: ${contextTopic}
    Education Level: ${eduLevel}
    Language: ${language}
    The prompts should be one sentence long and designed to test spontaneous thinking and logic.
    Output as a JSON array of strings.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });

  const raw = parseModelJson(response.text);
  return Array.isArray(raw) ? raw : [];
};

export const analyzeDrillBatch = async (
  recordings: { blob: Blob, prompt: string }[],
  type: DrillType,
  language: string,
  eduLevel: EducationLevel
): Promise<DrillBatchResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const partsPromises = recordings.map(async (rec, i) => {
    const reader = new FileReader();
    const base64 = await new Promise<string>((resolve) => {
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(rec.blob);
    });
    return [
      { text: `Round ${i + 1} Prompt: "${rec.prompt}"` },
      { inlineData: { mimeType: rec.blob.type || 'audio/webm', data: base64 } }
    ];
  });

  const resolvedParts = await Promise.all(partsPromises);
  const flattenedParts = resolvedParts.flat();

  const systemPrompt = `As a World-Class Speech Analyst, analyze these audio recordings for a ${type} drill.
    Target Audience Level: ${eduLevel}
    Language: ${language}
    
    For each round, provide:
    1. Score (1-10)
    2. Transcript
    3. logicFeedback: A concise roadmap of how the answer should have been structured.
    4. vocabUpgrades: Better word choices.
    5. polishedVersion: A professional-grade version of their answer.
    6. keyTransitions: Important linking words used or that should be used.
    
    Finally, provide an overallImprovement summary.
    Output JSON.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: { parts: [...flattenedParts, { text: systemPrompt }] },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          overallImprovement: { type: Type.STRING },
          rounds: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                round: { type: Type.INTEGER },
                score: { type: Type.INTEGER },
                prompt: { type: Type.STRING },
                transcript: { type: Type.STRING },
                logicFeedback: { type: Type.STRING },
                vocabUpgrades: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      original: { type: Type.STRING },
                      suggested: { type: Type.STRING },
                      tip: { type: Type.STRING }
                    }
                  }
                },
                polishedVersion: { type: Type.STRING },
                keyTransitions: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            }
          }
        }
      }
    }
  });

  const raw = parseModelJson(response.text);
  return {
    overallImprovement: raw.overallImprovement || "Analysis complete.",
    rounds: Array.isArray(raw.rounds) ? raw.rounds : []
  };
};
