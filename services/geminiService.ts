import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
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

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function callWithRetry<T>(fn: () => Promise<T>, retries = 2, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const msg = error.message || '';
    const isRateLimit = msg.includes('429') || msg.includes('quota') || error.code === 429 || error.status === 'RESOURCE_EXHAUSTED';
    
    if (isRateLimit && retries > 0) {
      console.warn(`API Rate Limit (429). Retrying in ${delay}ms...`);
      await wait(delay);
      return callWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export const generateInterviewQuestions = async (
  jobTitle: string, 
  jd: string,
  cv: string,
  level: ExperienceLevel,
  years: string,
  language: string,
  focusBalance: number, 
  weaknessContext?: string,
  excludedQuestions?: string[]
): Promise<InterviewQuestion[]> => {
  
  let techCount = 3;
  let expCount = 4;
  let introCount = 3;

  if (focusBalance > 70) {
    techCount = 7;
    expCount = 2;
    introCount = 1;
  } else if (focusBalance < 30) {
    techCount = 1;
    expCount = 3;
    introCount = 6;
  } else {
    techCount = 4;
    expCount = 4;
    introCount = 2;
  }

  let instruction = `Task: Generate EXACTLY 10 interview questions in ${language} for the position described in the Job Description below (${level}, ${years} years exp).`;
  
  if (weaknessContext) {
    instruction += `\nFOCUS ON WEAK AREAS: The candidate previously struggled with: ${weaknessContext}. Generate questions that drill these specific skills/scenarios.`;
  }
  
  if (excludedQuestions && excludedQuestions.length > 0) {
    instruction += `\nIMPORTANT: Do NOT repeat these questions: ${JSON.stringify(excludedQuestions.slice(0, 5))}.`;
  }

  const prompt = `${instruction}
    Context (JD): ${jd.slice(0, 2000)}
    Context (CV): ${cv.slice(0, 2000)}
    Output Language: ${language}
    Technical Focus Balance: ${focusBalance}/100 (Where 0 is Purely Behavioral, 100 is Purely Technical).
    
    CRITICAL CONSTRAINTS:
    1. LENGTH: Every question must be between 17 and 25 words. Concise, punchy, and professional.
    2. STYLE: Direct questions ONLY. Do NOT use preambles like "Given your experience at Company X..." or "I see you did Y...". Just ask the question immediately.
    3. FOCUS: Do NOT praise or recognize past achievements in the question text. The candidate knows their own history. Focus strictly on how they will apply skills to the NEW role.
    4. TECHNICAL SPECIFICITY: For "Technical/Scenario" questions, DO NOT ask vague questions like "Tell me about a time you used Java." Instead, present a specific, realistic scenario or task derived from the JD (e.g., "Our trading system has high latency during market open. How would you profile and optimize the Java garbage collection to fix this?"). Ask HOW they would resolve a specific task.
    
    DISTRIBUTION REQUIREMENTS (Total 10 Questions):
    1. ${introCount} questions: "Intro/General/Behavioral" (Culture fit, Soft skills).
    2. ${expCount} questions: "Experience Application" (Applying past work to new problems).
    3. ${techCount} questions: "Technical/Scenario" (Specific problem-solving tasks based on the JD).

    Output JSON format: [{"text": string, "category": string}]
    Category must be one of: "Intro", "Experience", "Technical", "Behavioral".`;

  try {
    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
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
    }));

    const raw = parseModelJson(response.text);
    const questions = Array.isArray(raw) ? raw : [];
    return questions.map((q: any, i: number) => ({
      id: `q-${i}-${Date.now()}`, 
      text: q.text || "Question text unavailable",
      category: q.category || "General"
    }));
  } catch (error) {
    console.error("Failed to generate questions after retries:", error);
    // Fallback questions to unblock user
    return [
        { id: 'err-1', text: "Could you tell me about yourself and why you applied for this role?", category: 'Intro' },
        { id: 'err-2', text: "What is your greatest professional strength and how does it apply here?", category: 'Intro' },
        { id: 'err-3', text: "Describe a challenging technical problem you solved recently.", category: 'Technical' },
        { id: 'err-4', text: "How do you handle conflict with a coworker?", category: 'Behavioral' },
        { id: 'err-5', text: "Where do you see yourself in five years?", category: 'Experience' }
    ];
  }
};

export const analyzeAnswer = async (
  audioBlob: Blob,
  question: string,
  jobTitle: string,
  jd: string,
  cv: string,
  level: ExperienceLevel,
  language: string
): Promise<QuestionAnalysis> => {
  const reader = new FileReader();
  const base64Audio = await new Promise<string>((resolve) => {
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(audioBlob);
  });

  const prompt = `As an Expert Interview Coach, evaluate this answer.
    Question: "${question}"
    Job Context (JD): ${jd.slice(0, 800)}
    Candidate CV: ${cv.slice(0, 800)}
    Target Language for Report: ${language}

    CRITICAL INSTRUCTION FOR SILENCE/POOR ANSWER:
    If the audio contains no speech, silence, or is extremely short/irrelevant:
    1. Set overallScore, logicScore, concisenessScore, and precisionScore to 0.
    2. transcript should be "(No speech detected)".
    3. expertCritique: Do NOT dwell on the fact that they were silent. Instead, immediately Pivot to teaching. "Here is the strategy you should use for this question..." and explain the core concept/trap of the question.
    4. You MUST still provide a "demoAnswer" and "answerFramework".

    Requirements:
    1. expertCritique: Professional assessment in ${language}.
    2. demoAnswer: A strong, standard professional response tailored to the JD/CV in ${language}. Use <u>underscores</u> for personal project names.
    3. ceoDemoAnswer: An "Executive/CEO Level" version of the answer. This should be visionary, strategic, high-impact, and show immense leadership potential. It should elevate the conversation from "doing the job" to "transforming the business".
    4. demoLogicRoadmap: A 3-5 step sequence of the ideal logic flow in ${language}.
    5. logicUpgrades: Specific tips in ${language}.
    6. answerFramework: SUGGEST A FRAMEWORK.
       - If Technical/Scenario: Suggest specific structure (e.g. "Problem-Solution-Impact", "Concept-Application-Tradeoffs").
       - If Behavioral: Suggest "STAR Method" (Situation, Task, Action, Result).
       - If General: Suggest "PREP" (Point, Reason, Example, Point).
       Provide the name, explanation, and concrete steps applied to this specific question context in ${language}.
    
    Scores (0-100). Output JSON.`;

  try {
    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
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
            ceoDemoAnswer: { type: Type.STRING },
            demoLogicRoadmap: { type: Type.ARRAY, items: { type: Type.STRING } },
            answerFramework: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                explanation: { type: Type.STRING },
                steps: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      step: { type: Type.STRING },
                      detail: { type: Type.STRING }
                    }
                  }
                }
              }
            },
            logicUpgrades: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    }));

    const raw = parseModelJson(response.text);
    return {
      overallScore: raw.overallScore || 0,
      logicScore: raw.logicScore || 0,
      concisenessScore: raw.concisenessScore || 0,
      precisionScore: raw.precisionScore || 0,
      expertCritique: raw.expertCritique || "Analysis unavailable.",
      transcript: raw.transcript || "",
      demoAnswer: raw.demoAnswer || "No demo answer generated.",
      ceoDemoAnswer: raw.ceoDemoAnswer || "Executive answer unavailable.",
      demoLogicRoadmap: Array.isArray(raw.demoLogicRoadmap) ? raw.demoLogicRoadmap : [],
      answerFramework: raw.answerFramework || { name: "Structured Approach", explanation: "Use a clear beginning, middle, and end.", steps: [] },
      logicUpgrades: Array.isArray(raw.logicUpgrades) ? raw.logicUpgrades : []
    };
  } catch (error) {
    console.error("Failed to analyze answer:", error);
    return {
      overallScore: 0,
      logicScore: 0,
      concisenessScore: 0,
      precisionScore: 0,
      expertCritique: "Service is currently experiencing high traffic (Quota Exceeded). Please try again later. In the meantime, focus on the STAR method.",
      transcript: "(Audio analysis unavailable)",
      demoAnswer: "Service Unavailable.",
      ceoDemoAnswer: "Service Unavailable.",
      demoLogicRoadmap: ["Situation", "Task", "Action", "Result"],
      answerFramework: { name: "Service Busy", explanation: "Quota exceeded", steps: [] },
      logicUpgrades: []
    };
  }
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
  const prompt = `Generate ${count} short, challenging speech prompts for a "${type}" drill.
    Topic Context: ${contextTopic}
    Education Level: ${eduLevel}
    Language: ${language}
    The prompts should be one sentence long and designed to test spontaneous thinking and logic.
    Output as a JSON array of strings.`;

  try {
    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
        }
        }
    }));

    const raw = parseModelJson(response.text);
    return Array.isArray(raw) ? raw : [];
  } catch (error) {
    return ["Describe your favorite book.", "Explain why the sky is blue.", "Sell me this pen."]; // Fallback
  }
};

export const analyzeDrillBatch = async (
  recordings: { blob: Blob, prompt: string }[],
  type: DrillType,
  language: string,
  eduLevel: EducationLevel
): Promise<DrillBatchResult> => {
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

  try {
    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
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
    }));

    const raw = parseModelJson(response.text);
    return {
        overallImprovement: raw.overallImprovement || "Analysis complete.",
        rounds: Array.isArray(raw.rounds) ? raw.rounds : []
    };
  } catch (error) {
    return {
        overallImprovement: "Analysis unavailable due to high server traffic.",
        rounds: recordings.map((_, i) => ({
            round: i + 1,
            score: 0,
            prompt: _.prompt,
            transcript: "Audio not analyzed.",
            logicFeedback: "N/A",
            vocabUpgrades: [],
            polishedVersion: "N/A",
            keyTransitions: []
        }))
    };
  }
};