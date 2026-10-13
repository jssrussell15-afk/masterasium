export type Difficulty = "easy" | "steady" | "harder";

export type WorksheetHeader = {
  showName: boolean;
  showDate: boolean;
  showGrade: boolean;
  showScore: boolean;
};

export type LayoutTemplate = {
  id: string;
  name: string;
  title: string;
  instructions: string;
  header: WorksheetHeader;
  logoData: string | null;
};

export type WorkedExample = {
  prompt: string;
  steps: string[];
  answer: string;
};

export type PracticeItem = {
  prompt: string;
  answer: string;
  steps: string[];
  skillId: string | null;
  example: WorkedExample | null;
};

export type PracticeSet = {
  code: string;
  title: string;
  instructions: string;
  subtitle: string | null;
  logoData: string | null;
  items: PracticeItem[];
};

export const EMPTY_HEADER: WorksheetHeader = {
  showName: true,
  showDate: true,
  showGrade: false,
  showScore: false,
};
