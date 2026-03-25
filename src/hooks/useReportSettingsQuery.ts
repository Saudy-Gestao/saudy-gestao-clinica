import { useQuery } from '@tanstack/react-query';
import insuranceService from '../services/insuranceService';
import procedureService from '../services/procedureService';
import reportConfigService from '../services/reportConfigService';
import reportPhraseService from '../services/reportPhraseService';
import reportTemplateService from '../services/reportTemplateService';
import reportWorklistService from '../services/reportWorklistService';
import { queryKeys } from '../lib/queryKeys';

export const fetchReportSettingsData = async () => {
  const [templatesData, phrasesData, worklistData, proceduresData, insurancesData, configData] = await Promise.all([
    reportTemplateService.list({ limit: 400, offset: 0 }),
    reportPhraseService.list({ limit: 400, offset: 0 }),
    reportWorklistService.list({ limit: 400, offset: 0 }),
    procedureService.listProcedures({ limit: 400, offset: 0 }),
    insuranceService.listInsurances({ limit: 400, offset: 0 }),
    reportConfigService.get(),
  ]);

  return {
    templatesData,
    phrasesData,
    worklistData,
    proceduresData,
    insurancesData,
    configData,
  };
};

export const useReportSettingsQuery = () => useQuery({
  queryKey: queryKeys.reportSettings,
  queryFn: fetchReportSettingsData,
  refetchInterval: 15_000,
});
