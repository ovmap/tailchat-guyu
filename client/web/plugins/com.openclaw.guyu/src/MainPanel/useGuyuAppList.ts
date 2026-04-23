import { postRequest, useAsyncRefresh, appendUrlSearch, useLocation, urlSearchParse, isValidStr, useNavigate } from '@capital/common';
import { useEffect, useState } from 'react';

export interface GuyuApp {
  _id: string;
  appId: string;
  appSecret: string;
  appName: string;
  appDesc: string;
  appIcon: string;
  capability: string[];
  bot?: {
    callbackUrl: string;
  };
}

/**
 * 谷雨应用列表 Hook
 */
export function useGuyuAppList() {
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  const {
    loading,
    value: allApps = [],
    refresh,
  } = useAsyncRefresh(async (): Promise<GuyuApp[]> => {
    try {
      const { data } = await postRequest('/guyu.app/all');
      return data ?? [];
    } catch (e) {
      console.error('Failed to load guyu apps:', e);
      return [];
    }
  }, []);

  const navigate = useNavigate();
  const location = useLocation();

  // 从 URL 参数恢复选中的应用
  useEffect(() => {
    // 仅初始化的时候才处理
    const { appId } = urlSearchParse(location.search, {
      ignoreQueryPrefix: true,
    });

    if (isValidStr(appId)) {
      setSelectedAppId(appId);
    }
  }, []);

  const appInfo = allApps.find((a) => a._id === selectedAppId) || null;

  const handleSetSelectedApp = (appId: string | null) => {
    navigate({
      search: appendUrlSearch({
        appId,
      }),
    });
    setSelectedAppId(appId);
  };

  return {
    loading,
    allApps,
    refresh,
    appInfo,
    handleSetSelectedApp,
  };
}
