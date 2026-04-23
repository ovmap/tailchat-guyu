import React, { useMemo } from 'react';
import { Button, Loading, Table, Space } from '@capital/component';
import { useGuyuAppList } from './useGuyuAppList';
import { AppSetup } from './AppSetup';
import { Translate } from '../translate';

const GuyuMainPanel: React.FC = React.memo(() => {
  const { loading, allApps, refresh, appInfo, handleSetSelectedApp } =
    useGuyuAppList();
  const [showCreate, setShowCreate] = React.useState(false);

  const columns = useMemo(
    () => [
      {
        title: Translate.appName || '应用名称',
        dataIndex: 'appName',
      },
      {
        title: Translate.appDesc || '描述',
        dataIndex: 'appDesc',
      },
      {
        title: '操作',
        key: 'action',
        render: (_: any, record: any) => (
          <Space>
            <Button onClick={() => handleSetSelectedApp(record._id)}>
              进入
            </Button>
          </Space>
        ),
      },
    ],
    []
  );

  const handleCreateApp = () => {
    setShowCreate(true);
  };

  const handleBackToList = () => {
    setShowCreate(false);
    handleSetSelectedApp(null);
  };

  return (
    <Loading spinning={loading} style={{ height: '100%' }}>
      {appInfo ? (
        <AppSetup appInfo={appInfo} onBack={handleBackToList} />
      ) : showCreate ? (
        <AppSetup onBack={handleBackToList} onSuccess={() => {
          refresh();
          setShowCreate(false);
        }} />
      ) : (
        <div className="p-4">
          <Button
            style={{ marginBottom: 10 }}
            type="primary"
            onClick={handleCreateApp}
          >
            {Translate.createApp || '创建应用'}
          </Button>
          <Table
            columns={columns}
            dataSource={allApps}
            pagination={false}
            rowKey="_id"
          />
        </div>
      )}
    </Loading>
  );
});
GuyuMainPanel.displayName = 'GuyuMainPanel';

export default GuyuMainPanel;