import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { reportService } from '../services/reportService';
import type { ReportResponse, ReportStatus } from '../types';

export const REPORT_STATUS_FILTERS: Array<{ label: string; value: 'ALL' | ReportStatus }> = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Reviewed', value: 'REVIEWED' },
  { label: 'Dismissed', value: 'DISMISSED' },
];

const PAGE_SIZE = 20;

export function useModerationReportsModel(whiteboardId?: string) {
  const [reports, setReports] = useState<ReportResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | ReportStatus>('ALL');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const lastFetchRef = useRef(0);
  const lastFilterRef = useRef(statusFilter);

  const fetchReports = useCallback(
    async (options?: { page?: number; replace?: boolean }) => {
      if (!whiteboardId) {
        setLoadError('Missing whiteboard id.');
        setLoading(false);
        return;
      }

      const nextPage = options?.page ?? 0;
      const replace = options?.replace ?? true;
      if (!replace && (!hasMore || loadingMore)) {
        return;
      }

      try {
        if (replace) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }

        const response = await reportService.list(
          whiteboardId,
          nextPage,
          PAGE_SIZE,
          statusFilter === 'ALL' ? undefined : statusFilter
        );

        setReports((previousReports) =>
          replace ? response.content : [...previousReports, ...response.content]
        );
        setPage(nextPage);
        setHasMore(nextPage + 1 < response.totalPages);
        setLoadError(null);
        lastFetchRef.current = Date.now();
      } catch {
        if (replace) {
          setReports([]);
        }
        setHasMore(false);
        setLoadError('Failed to load reports.');
      } finally {
        if (replace) {
          setLoading(false);
        } else {
          setLoadingMore(false);
        }
      }
    },
    [hasMore, loadingMore, statusFilter, whiteboardId]
  );

  useFocusEffect(
    useCallback(() => {
      const filterChanged = lastFilterRef.current !== statusFilter;
      if (filterChanged) {
        lastFilterRef.current = statusFilter;
        fetchReports({ page: 0, replace: true });
        return;
      }

      const now = Date.now();
      const isStale = now - lastFetchRef.current > 30000;
      if (reports.length === 0 || isStale) {
        fetchReports({ page: 0, replace: true });
      }
    }, [fetchReports, reports.length, statusFilter])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchReports({ page: 0, replace: true });
    setRefreshing(false);
  }, [fetchReports]);

  const handleLoadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) {
      return;
    }

    await fetchReports({ page: page + 1, replace: false });
  }, [fetchReports, hasMore, loading, loadingMore, page]);

  const handleStatusFilter = useCallback((nextFilter: 'ALL' | ReportStatus) => {
    setLoading(true);
    setStatusFilter(nextFilter);
  }, []);

  const dismissReport = useCallback(async (reportId: string) => {
    await reportService.review(reportId, { status: 'DISMISSED' });
    setReports((previousReports) => previousReports.filter((report) => report.id !== reportId));
  }, []);

  const removeReportedContent = useCallback(async (reportId: string) => {
    await reportService.review(reportId, { status: 'REVIEWED' });
    setReports((previousReports) => previousReports.filter((report) => report.id !== reportId));
  }, []);

  return {
    reports,
    loading,
    refreshing,
    statusFilter,
    loadError,
    loadingMore,
    handleRefresh,
    handleLoadMore,
    handleStatusFilter,
    dismissReport,
    removeReportedContent,
  };
}
