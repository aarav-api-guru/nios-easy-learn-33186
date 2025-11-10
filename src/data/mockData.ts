export interface Subject {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export interface Chapter {
  id: string;
  subjectId: string;
  chapterNumber: number;
  name: string;
  description: string;
  resourceCount: number;
}

export interface Resource {
  id: string;
  chapterId: string;
  title: string;
  type: 'question_paper' | 'answer_key';
  googleDriveId: string;
  fileName: string;
  fileSize: string;
  setId: string; // To group question papers and answer keys together
  year: string;
}

export interface Comment {
  id: string;
  chapterId: string;
  parentCommentId?: string;
  visitorName: string;
  visitorEmail?: string;
  commentText: string;
  isApproved: boolean;
  createdAt: string;
  replies?: Comment[];
}

export const subjects: Subject[] = [
  {
    id: 'math',
    name: 'Mathematics',
    description: 'Master math concepts with comprehensive question papers and solutions',
    icon: '📐',
    color: 'primary',
  },
  {
    id: 'science',
    name: 'Science',
    description: 'Explore scientific concepts through detailed study materials',
    icon: '🔬',
    color: 'secondary',
  },
];

export const chapters: Chapter[] = [
  {
    id: 'math-1',
    subjectId: 'math',
    chapterNumber: 1,
    name: 'Real Numbers',
    description: 'Learn about rational and irrational numbers, Euclid\'s division algorithm',
    resourceCount: 4,
  },
  {
    id: 'math-2',
    subjectId: 'math',
    chapterNumber: 2,
    name: 'Polynomials',
    description: 'Understanding polynomials, their types, and operations',
    resourceCount: 4,
  },
  {
    id: 'science-1',
    subjectId: 'science',
    chapterNumber: 1,
    name: 'Chemical Reactions',
    description: 'Types of chemical reactions and equations',
    resourceCount: 4,
  },
  {
    id: 'science-2',
    subjectId: 'science',
    chapterNumber: 2,
    name: 'Life Processes',
    description: 'Understanding nutrition, respiration, and life processes',
    resourceCount: 4,
  },
];

export const resources: Resource[] = [
  {
    id: 'res-1',
    chapterId: 'math-1',
    title: 'Question Paper 2024',
    type: 'question_paper',
    googleDriveId: 'sample-drive-id-1',
    fileName: 'Math_Ch1_QP_2024.pdf',
    fileSize: '2.5 MB',
    setId: 'math-1-2024',
    year: '2024',
  },
  {
    id: 'res-2',
    chapterId: 'math-1',
    title: 'Answer Key 2024',
    type: 'answer_key',
    googleDriveId: 'sample-drive-id-2',
    fileName: 'Math_Ch1_AK_2024.pdf',
    fileSize: '3.1 MB',
    setId: 'math-1-2024',
    year: '2024',
  },
  {
    id: 'res-3',
    chapterId: 'math-1',
    title: 'Question Paper 2023',
    type: 'question_paper',
    googleDriveId: 'sample-drive-id-3',
    fileName: 'Math_Ch1_QP_2023.pdf',
    fileSize: '2.3 MB',
    setId: 'math-1-2023',
    year: '2023',
  },
  {
    id: 'res-4',
    chapterId: 'math-1',
    title: 'Answer Key 2023',
    type: 'answer_key',
    googleDriveId: 'sample-drive-id-4',
    fileName: 'Math_Ch1_AK_2023.pdf',
    fileSize: '2.8 MB',
    setId: 'math-1-2023',
    year: '2023',
  },
];
