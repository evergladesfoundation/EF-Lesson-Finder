export interface Lesson {
  id: string;
  title: string;
  gradeRange: string;
  gradeMin: number;
  gradeMax: number;
  topics: string[];
  ngsssStandards: string[];
  fundamentalConcept: string;
  summary: string;
  /** Google Drive folder for the lesson materials. */
  lessonUrl: string;
  /** Direct PDF download. Empty when the index has no public PDF (e.g. 6.3). */
  pdfUrl: string;
}

export interface LessonCardResult extends Lesson {}

export interface ChatReply {
  text: string;
  lessons: LessonCardResult[];
}
