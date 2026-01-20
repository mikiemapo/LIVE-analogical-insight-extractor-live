
export interface AZ104Question {
  text: string;
  correctAnswer: string;
  explanation?: string;
}

export interface ExtractedQuestion {
  id: string;
  text: string;
  correctAnswer: string;
  explanation: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface InsightBlock {
  foundationalRule: string;
  whyItWorks: string;
  analogy: string;
  analogousFoundationalConcept: string;
  commonConfusion: string;
  examEliminationCue: string;
  memoryHook: string;
}

export interface ExtractionResult {
  domain: string;
  blocks: InsightBlock[];
  sources?: GroundingSource[];
}

export enum ProcessingStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}
