import { useQuery } from '@tanstack/react-query';
import reportTemplateService from '../services/reportTemplateService';
import reportPhraseService from '../services/reportPhraseService';
import reportService from '../services/reportService';
import reportConfigService from '../services/reportConfigService';
import { queryKeys } from '../lib/queryKeys';

export const fetchReportExamsPageData = async () => {
  const [reportData, templateData, phraseData, configData] = await Promise.all([
    reportService.list({ limit: 300, offset: 0 }),
    reportTemplateService.list({ limit: 400, offset: 0 }),
    reportPhraseService.list({ limit: 400, offset: 0 }),
    reportConfigService.get().catch(() => null),
  ]);

  return {
    reportData,
    templateData,
    phraseData,
    configData,
  };
};

export const useReportExamsPageDataQuery = () => useQuery({
  queryKey: queryKeys.reportExamsPageData,
  queryFn: fetchReportExamsPageData,
  refetchInterval: 15_000,
});
