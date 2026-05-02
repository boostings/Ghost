import api from './api';
import { Config } from '../constants/config';
import type {
  CourseCatalogImportResult,
  CourseSectionResponse,
  PageResponse,
  PaginationParams,
} from '../types';

export const COURSE_CATALOG_TERMS = [
  'Spring 2026',
  'Summer 2026',
  'Fall 2026',
  'Winter 2026',
] as const;

export type CourseCatalogSortBy =
  | 'courseCode'
  | 'courseName'
  | 'subject'
  | 'catalogNumber'
  | 'section'
  | 'classNumber'
  | 'teacher'
  | 'session'
  | 'career'
  | 'instructionMode'
  | 'meetingTimes'
  | 'weeks'
  | 'openSection'
  | 'lowCostMaterials'
  | 'noCostMaterials'
  | 'department'
  | 'credit'
  | 'semester';

export type CourseCatalogSortDirection = 'ASC' | 'DESC';

export const courseCatalogService = {
  getSections: async (
    params?: PaginationParams & {
      semester?: string;
      query?: string;
      courseCode?: string;
      subject?: string;
      sortBy?: CourseCatalogSortBy;
      sortDirection?: CourseCatalogSortDirection;
    }
  ): Promise<PageResponse<CourseSectionResponse>> => {
    const response = await api.get<PageResponse<CourseSectionResponse>>(
      '/course-catalog/sections',
      {
        params: {
          semester: params?.semester,
          q: params?.query,
          courseCode: params?.courseCode,
          subject: params?.subject,
          sortBy: params?.sortBy,
          sortDirection: params?.sortDirection,
          page: params?.page ?? 0,
          size: params?.size ?? Config.PAGE_SIZE,
        },
      }
    );
    return response.data;
  },

  getAllSectionsForCourse: async (params: {
    courseCode: string;
    semester: string;
  }): Promise<CourseSectionResponse[]> => {
    const size = 100;
    const firstPage = await courseCatalogService.getSections({
      courseCode: params.courseCode,
      semester: params.semester,
      sortBy: 'section',
      sortDirection: 'ASC',
      page: 0,
      size,
    });

    if (firstPage.totalPages <= 1) {
      return firstPage.content;
    }

    const remainingPages = await Promise.all(
      Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
        courseCatalogService.getSections({
          courseCode: params.courseCode,
          semester: params.semester,
          sortBy: 'section',
          sortDirection: 'ASC',
          page: index + 1,
          size,
        })
      )
    );

    return [...firstPage.content, ...remainingPages.flatMap((page) => page.content)];
  },

  importAllowedTerms: async (): Promise<CourseCatalogImportResult> => {
    const response = await api.post<CourseCatalogImportResult>('/faculty/course-catalog/import');
    return response.data;
  },
};
