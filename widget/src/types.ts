export interface Lesson {
  id: string;
  title: string;
  gradeRange: string;
  gradeMin: number;
  gradeMax: number;
  topics: string[];
  ngsssStandards: string[];
  apUnitTitles: string[];
  apUnitNumbers: number[];
  fundamentalConcept: string;
  summary: string;
  lessonUrl: string;
  pdfUrl: string;
}

export interface LessonCardResult extends Lesson {}

export interface ChatReply {
  text: string;
  lessons: LessonCardResult[];
}
