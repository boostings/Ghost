import api from './api';
import { Config } from '../constants/config';
import type {
  CourseCatalogImportResult,
  CourseSectionResponse,
  PageResponse,
  PaginationParams,
} from '../types';

export const COURSE_CATALOG_TERMS = ['Summer 2026', 'Fall 2026', 'Winter 2026'] as const;

export const courseCatalogService = {
  getSections: async (
    params?: PaginationParams & { semester?: string }
  ): Promise<PageResponse<CourseSectionResponse>> => {
    const response = await api.get<PageResponse<CourseSectionResponse>>(
      '/course-catalog/sections',
      {
        params: {
          semester: params?.semester,
          page: params?.page ?? 0,
          size: params?.size ?? Config.PAGE_SIZE,
        },
      }
    );
    return response.data;
  },

  importAllowedTerms: async (): Promise<CourseCatalogImportResult> => {
    const response = await api.post<CourseCatalogImportResult>('/faculty/course-catalog/import');
    return response.data;
  },
};
