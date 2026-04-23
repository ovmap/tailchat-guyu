import React, { useState } from 'react';
import { Avatar, Button, Input, UserName } from '@capital/component';
import styled from 'styled-components';
import type { OpenAppInfo } from 'types';
import {
  useAsyncRequest,
  postRequest,
  showErrorToasts,
  useGroupIdContext,
  showSuccessToasts,
} from '@capital/common';
import { Translate } from './translate';

const Tip = styled.div`
  color: #999;
  margin-bottom: 10px;
`;

const Row = styled.div`
  display: flex;
`;

const AppInfoCard = styled.div({
  backgroundColor: 'rgba(0, 0, 0, 0.1)',
  borderRadius: 3,
  padding: 10,
  marginTop: 10,

  '.app-info': {
    flex: 1,
    marginLeft: 10,

    '.title': {
      fontSize: 18,
      fontWeight: 'bold',
    },

    '.action': {
      marginTop: 10,
    },
  },
});

const IntegrationPanel: React.FC = React.memo(() => {
  const [appId, setAppId] = useState('');
  const [openAppInfo, setOpenAppInfo] = useState<OpenAppInfo | null>(null);
  const [appType, setAppType] = useState<'openapi' | 'guyu' | null>(null);
  const groupId = useGroupIdContext();

  const [{ loading }, handleQueryApp] = useAsyncRequest(async () => {
    let found = false;

    // 先尝试查询 OpenAPI 应用
    try {
      const { data } = await postRequest('/openapi/app/get', {
        appId,
      });

      if (data) {
        setOpenAppInfo(data);
        setAppType('openapi');
        found = true;
      }
    } catch (e) {
      console.log('OpenAPI app not found, trying Guyu app...');
    }

    // 如果 OpenAPI 应用未找到，尝试查询谷雨应用
    if (!found) {
      try {
        const { data } = await postRequest('/guyu.app/get', {
          appId,
        });

        if (data) {
          setOpenAppInfo(data);
          setAppType('guyu');
          found = true;
        }
      } catch (e) {
        console.log('Guyu app not found');
      }
    }

    if (!found) {
      showErrorToasts(Translate.notFoundApp);
      setOpenAppInfo(null);
      setAppType(null);
    }
  }, [appId]);

  const [{ loading: addBotLoading }, handleAddBotIntoGroup] =
    useAsyncRequest(async () => {
      if (!appType) {
        showErrorToasts('未找到应用信息');
        return;
      }

      // 根据应用类型调用对应的接口
      const endpoint =
        appType === 'guyu'
          ? '/guyu.integration/addBotUser'
          : '/openapi/integration/addBotUser';

      await postRequest(endpoint, {
        appId,
        groupId,
      });
      showSuccessToasts();
    }, [appId, appType]);

  return (
    <div>
      <Tip>{Translate.onlyAllowManualAddition}</Tip>

      <Row>
        <Input
          placeholder={Translate.appId}
          value={appId}
          onChange={(e) => setAppId(e.target.value)}
        />
        <Button
          type="primary"
          disabled={!appId}
          loading={loading}
          onClick={handleQueryApp}
        >
          {Translate.search}
        </Button>
      </Row>

      {openAppInfo && (
        <div>
          <AppInfoCard>
            <Row>
              <Avatar
                size={56}
                src={openAppInfo.appIcon}
                name={openAppInfo.appName}
              />

              <div className="app-info">
                <div>{openAppInfo.appName}</div>
                <div>{openAppInfo.appDesc}</div>
                <Row>
                  <div>{Translate.developer}:</div>
                  <UserName userId={openAppInfo.owner} />
                </Row>

                <div className="action">
                  {openAppInfo.capability.includes('bot') ? (
                    <Button
                      type="primary"
                      size="small"
                      loading={addBotLoading}
                      onClick={handleAddBotIntoGroup}
                    >
                      {Translate.addBot}
                    </Button>
                  ) : (
                    <Button type="primary" size="small" disabled={true}>
                      {Translate.cannotAddBot}
                    </Button>
                  )}
                </div>
              </div>
            </Row>
          </AppInfoCard>
        </div>
      )}
    </div>
  );
});
IntegrationPanel.displayName = 'IntegrationPanel';

export default IntegrationPanel;
