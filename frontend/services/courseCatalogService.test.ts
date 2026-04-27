type CourseCatalogServiceModule = typeof import('./courseCatalogService');

async function loadCourseCatalogService(): Promise<{
  module: CourseCatalogServiceModule;
  apiMock: {
    get: jest.Mock;
    post: jest.Mock;
  };
}> {
  jest.resetModules();

  const apiMock = {
    get: jest.fn(),
    post: jest.fn(),
  };

  jest.doMock('./api', () => ({
    __esModule: true,
    default: apiMock,
  }));

  const module = require('./courseCatalogService') as CourseCatalogServiceModule;
  return { module, apiMock };
}

describe('courseCatalogService', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('requests paginated catalog sections by allowed semester', async () => {
    const { module, apiMock } = await loadCourseCatalogService();
    const page = {
      content: [
        {
          id: 'section-1',
          courseCode: 'IT326',
          courseName: 'Systems Analysis',
          subject: 'IT',
          catalogNumber: '326',
          departmentName: 'Information Technology (IT)',
          courseDescription: 'Systems analysis methods',
          credit: '3.00',
          semester: 'Fall 2026',
          termId: '2272',
          section: '001',
          classNumber: '9001',
          instructor: 'Professor Ghost',
          session: 'Full Semester',
          career: 'Undergraduate',
          instructionMode: 'In Person',
          meetingPattern: 'Mo We',
          meetingTimes: '09:00AM - 10:15AM',
          numberOfWeeks: 16,
          openSection: true,
          lowCostMaterialsSection: false,
          noCostMaterialsSection: true,
        },
      ],
      page: 1,
      size: 10,
      totalElements: 1,
      totalPages: 1,
    };
    apiMock.get.mockResolvedValue({ data: page });

    const result = await module.courseCatalogService.getSections({
      semester: 'Fall 2026',
      query: 'systems',
      subject: 'IT',
      sortBy: 'teacher',
      sortDirection: 'DESC',
      page: 1,
      size: 10,
    });

    expect(result).toEqual(page);
    expect(apiMock.get).toHaveBeenCalledWith('/course-catalog/sections', {
      params: {
        semester: 'Fall 2026',
        q: 'systems',
        subject: 'IT',
        sortBy: 'teacher',
        sortDirection: 'DESC',
        page: 1,
        size: 10,
      },
    });
  });

  it('imports only the backend-defined allowed catalog terms', async () => {
    const { module, apiMock } = await loadCourseCatalogService();
    const result = {
      allowedTerms: ['Summer 2026', 'Fall 2026', 'Winter 2026'],
      sectionsImported: 5941,
    };
    apiMock.post.mockResolvedValue({ data: result });

    await expect(module.courseCatalogService.importAllowedTerms()).resolves.toEqual(result);

    expect(module.COURSE_CATALOG_TERMS).toEqual(['Summer 2026', 'Fall 2026', 'Winter 2026']);
    expect(apiMock.post).toHaveBeenCalledWith('/faculty/course-catalog/import');
  });
});
