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

export interface GeneratedQuestions {
  jobTitle: string;
  questions: InterviewQuestion[];
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
): Promise<GeneratedQuestions> => {
  
  // Distribution heavily weighted toward technical & scenario questions
  let techCount: number, scenarioCount: number, expCount: number, introCount: number;

  if (focusBalance > 70) {
    // Technical focus: almost entirely hard skills
    techCount = 5; scenarioCount = 3; expCount = 2; introCount = 0;
  } else if (focusBalance < 30) {
    // Behavioral focus: still has technical, just less
    techCount = 2; scenarioCount = 3; expCount = 2; introCount = 3;
  } else {
    // Balanced DEFAULT: still mostly technical
    techCount = 4; scenarioCount = 3; expCount = 2; introCount = 1;
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

    === HARD RULES ===
    1. LENGTH: Every question must be between 17 and 35 words.
    2. STYLE: Direct questions ONLY. No preambles like "Given your experience at..." or "I see you did...". Jump straight into the problem.
    3. NO SOFT QUESTIONS IN TECHNICAL/SCENARIO/EXPERIENCE CATEGORIES: Questions about "communication", "negotiation", "conflict resolution", "stakeholder management", "team dynamics", or "culture fit" are ONLY allowed in the Intro category. Technical, Scenario, and Experience questions must be about HARD SKILLS — actual work output, tools, systems, architecture, code, processes, or domain expertise.

    === WHAT "TECHNICAL" MEANS (BE STRICT) ===
    Technical questions must require DOMAIN KNOWLEDGE to answer. The candidate must demonstrate they know HOW to do the actual work, not how to talk about it.
    GOOD Technical examples:
    - "Our PostgreSQL queries slow to 8 seconds under load. Walk me through your diagnosis and optimization approach."
    - "Design a caching strategy for our product catalog API that serves 50K concurrent users."
    - "Our React app bundle is 4MB. What specific techniques would you use to reduce it below 1MB?"
    - "Write a data pipeline that ingests CSV uploads, validates schemas, and loads into our warehouse. What tools and approach?"
    BAD (these are NOT technical, do NOT generate these):
    - "A product owner demands a feature that compromises security. How do you communicate the risks?" ← This is COMMUNICATION, not technical
    - "How do you ensure code quality across the team?" ← This is PROCESS/MANAGEMENT, not technical
    - "A stakeholder disagrees with your technical approach. How do you handle it?" ← This is NEGOTIATION, not technical

    === CATEGORY DEFINITIONS ===
    "Technical" = Hard problems requiring domain expertise. The candidate must explain a technical solution: debugging, architecture, system design, code, tooling, data modeling, infrastructure, algorithms, performance optimization, security implementation.
    "Scenario" = Give the candidate a realistic WORK TASK to complete. Not interpersonal — an actual deliverable or technical challenge: "Build X", "Debug Y", "Migrate from A to B", "A production incident happens — what are your exact steps?", "Design the data model for feature X".
    "Experience" = Bridge CV-to-JD: "Your CV shows experience with X. Our stack uses Y. How would you apply your knowledge to solve [specific technical problem from JD]?"
    "Intro" = The ONLY category for soft skills, culture, communication, leadership style, motivation. Keep to minimum.

    === DISTRIBUTION (Total 10 Questions) ===
    1. ${techCount} questions: "Technical"
    2. ${scenarioCount} questions: "Scenario"
    3. ${expCount} questions: "Experience"
    4. ${introCount} questions: "Intro"

    Output JSON format: {"jobTitle": string, "questions": [{"text": string, "category": string}]}
    "jobTitle": Extract the exact job title / role name from the JD (e.g. "Senior Product Manager", "Full Stack Developer"). Keep it short (1-5 words). If unclear, use "General Interview".
    Category must be one of: "Intro", "Experience", "Technical", "Scenario".`;

  try {
    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            jobTitle: { type: Type.STRING },
            questions: {
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
        }
      }
    }));

    const raw = parseModelJson(response.text);
    const questions = Array.isArray(raw.questions) ? raw.questions : (Array.isArray(raw) ? raw : []);
    const extractedTitle = raw.jobTitle || "General Interview";
    return {
      jobTitle: extractedTitle,
      questions: questions.map((q: any, i: number) => ({
        id: `q-${i}-${Date.now()}`,
        text: q.text || "Question text unavailable",
        category: q.category || "General"
      })),
    };
  } catch (error) {
    console.error("Failed to generate questions after retries:", error);
    // Fallback questions to unblock user
    return {
      jobTitle: jobTitle || "General Interview",
      questions: [
        { id: 'err-1', text: "Could you tell me about yourself and why you applied for this role?", category: 'Intro' },
        { id: 'err-2', text: "What is your greatest professional strength and how does it apply here?", category: 'Intro' },
        { id: 'err-3', text: "Describe a challenging technical problem you solved recently.", category: 'Technical' },
        { id: 'err-4', text: "How do you handle conflict with a coworker?", category: 'Behavioral' },
        { id: 'err-5', text: "Where do you see yourself in five years?", category: 'Experience' }
      ],
    };
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
       - If Technical: Suggest specific structure (e.g. "Problem-Solution-Impact", "Concept-Application-Tradeoffs").
       - If Scenario (work situation): Suggest "SCORE" (Situation, Constraints, Options, Response, Evaluation) or "Incident Response" framework.
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