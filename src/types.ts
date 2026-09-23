export type Confidence = 'high' | 'medium' | 'low' | 'unknown';

export interface GlossaryEntry {
  lineIndex: number;
  surface: string;
  pinyin?: string;
  partOfSpeech?: string;
  meaningInContext: string;
  literalTranslation?: string;
  plainTranslation?: string;
  grammar?: string;
  notes?: string[];
  evidence?: string[];
  uncertainty?: string;
  confidence: Confidence;
  source?: string;
}

export interface Work {
  id: string;
  title: string;
  author: string;
  dynasty: string;
  genre: string;
  intro: string;
  background?: string;
  analysis?: string;
  themeMeaning?: string;
  collections: string[];
  themes: string[];
  moods: string[];
  order?: number;
  sectionBreaks?: number[];
  imported?: boolean;
  featured?: boolean;
  lines: string[];
  translations: string[];
  source: string;
  glossary: GlossaryEntry[];
}

export interface ApiSettings {
  endpoint: string;
  apiKey: string;
  model: string;
}

export interface ExplainRequest {
  work: Work;
  lineIndex: number;
  selectionStart: number;
  selectionEnd: number;
}

export interface Explanation {
  selection: string;
  pinyin?: string;
  partOfSpeech?: string;
  meaningInContext: string;
  literalTranslation?: string;
  plainTranslation?: string;
  grammar?: string;
  notes: string[];
  evidence: string[];
  uncertainty?: string;
  confidence: Confidence;
  source: 'local' | 'api' | 'fallback';
}


export interface DailyRecommendation {
  workId: string;
  lineIndex: number;
  quote: string;
  reason: string;
  moodTags: string[];
  confidence: Confidence;
  source: 'random' | 'api';
}

export interface ClassicSection {
  title: string;
  text: string;
}

export interface Classic {
  id: string;
  title: string;
  author: string;
  category: '儒家' | '道家' | '其他';
  kind?: '典籍' | '名句';
  note?: string;
  source: string;
  sections: ClassicSection[];
}
