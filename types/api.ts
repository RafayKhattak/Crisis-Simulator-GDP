import type { CharacterRow, MessageRow, ScenarioRow } from "@/types/database";

export type EvaluatorResult = {
  violation: boolean;
  reason: string;
};

export type SendMessageRequest = {
  userMessage: string;
  characterId: string;
  scenarioId: string;
};

export type SendMessageResponse = {
  character_reply: MessageRow;
  evaluator_result: EvaluatorResult;
  user_message: MessageRow;
};

export type PublicTrainee = {
  id: string;
  name: string;
  email: string;
};

export type ScenarioPayload = {
  scenario: ScenarioRow;
  characters: CharacterRow[];
  messages: MessageRow[];
  traineeEmail: string;
  trainee: PublicTrainee;
  demoMode: boolean;
};

export type SessionNudge = {
  at: string;
  toName: string;
  toEmail: string;
  excerpt: string;
  reason: string;
};

export type EmailEvaluation = {
  toName: string;
  toEmail: string;
  excerpt: string;
  violation: boolean;
  reason: string;
};

export type DebriefReport = {
  overallScore: number;
  grade: string;
  headline: string;
  summary: string;
  strengths: string[];
  gaps: string[];
  lessons: string[];
  nextTime: string[];
  scenarioTitle: string;
  traineeName: string;
  timing: {
    outboundCount: number;
    peopleContacted: string[];
    officersTotal: number;
    compliantCount: number;
    violationCount: number;
  };
  nudges: SessionNudge[];
  evaluations: EmailEvaluation[];
};

export type CompleteScenarioRequest = {
  scenarioId: string;
  scenarioTitle?: string;
  nudges?: SessionNudge[];
  messages?: MessageRow[];
};
