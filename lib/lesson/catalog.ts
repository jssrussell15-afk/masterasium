import { skillById } from "@/lib/practice/skills";

/** A video id from the Grade 3 list. The file URL is filled in later. */
export type LessonVideo = {
  id: string;
  title: string;
  url: null;
};

export type LessonDef = {
  skillId: string;
  /** One sentence the child can say to a parent when the skill is finished. */
  sentence: string;
  video: LessonVideo | null;
};

/**
 * Grade 3 skills already in the practice catalog.
 * Video ids are copied only where the topic is the same idea as the list.
 */
export const LESSONS: LessonDef[] = [
  {
    skillId: "g3-place",
    sentence: "Where a digit sits tells what it is worth, so in 482 the 4 means 4 hundreds.",
    video: {
      id: "G3-01",
      title: "Numbers to 1000: what each digit is worth",
      url: null,
    },
  },
  {
    skillId: "g3-add-sub",
    sentence: "I can add hundreds, tens, and ones, and check that the answer is close to my estimate.",
    video: {
      id: "G3-02",
      title: "Round to estimate, then add within 1000",
      url: null,
    },
  },
  {
    skillId: "g3-mult",
    sentence: "Equal groups tell a multiplication: 6 groups of 7 is 42.",
    video: {
      id: "G3-04",
      title: "Equal rows: multiplying and dividing with arrays",
      url: null,
    },
  },
  {
    skillId: "g3-div-rem",
    sentence: "If a division does not come out even, I write how many groups fit, then R, then what is left.",
    video: null,
  },
  {
    skillId: "g3-fractions",
    sentence: "The bottom number counts the equal parts, and the top number counts how many of those parts I mean.",
    video: {
      id: "G3-08",
      title: "Fair shares and equal fractions",
      url: null,
    },
  },
  {
    skillId: "g3-perimeter",
    sentence: "Perimeter is the distance all the way around, so I add every side.",
    video: {
      id: "G3-07",
      title: "Perimeter: the distance all the way around",
      url: null,
    },
  },
  {
    skillId: "g3-time",
    sentence: "The hour stays put until the minutes pass 60, and then the clock moves to the next hour.",
    video: {
      id: "G3-12",
      title: "Telling time to the minute",
      url: null,
    },
  },
  {
    skillId: "g3-data",
    sentence: "A bar's height is a count, so I can add the bars or compare them.",
    video: null,
  },
];

const BY_ID = new Map(LESSONS.map((lesson) => [lesson.skillId, lesson]));

export function isLessonSkill(skillId: string): boolean {
  return BY_ID.has(skillId);
}

export function lessonById(skillId: string): LessonDef | undefined {
  const lesson = BY_ID.get(skillId);
  if (!lesson || !skillById(skillId)) return undefined;
  return lesson;
}

export function lessonSkillIds(): string[] {
  return LESSONS.map((lesson) => lesson.skillId);
}
