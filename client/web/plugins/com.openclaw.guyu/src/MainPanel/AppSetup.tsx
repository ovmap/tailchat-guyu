import React, { useState } from 'react';
import { Button, Card } from '@capital/component';
import { postRequest, showToasts } from '@capital/common';
import { Translate } from '../translate';
import type { GuyuApp } from './useGuyuAppList';

interface AppSetupProps {
  appInfo?: GuyuApp | null;
  onBack?: () => void;
  onSuccess?: (app: GuyuApp) => void;
}

export const AppSetup: React.FC<AppSetupProps> = ({ appInfo, onBack, onSuccess }) => {
  const [step, setStep] = useState(0);
  const [createdApp, setCreatedApp] = useState<GuyuApp | null>(null);
  const [loading, setLoading] = useState(false);

  // 如果有传入的 appInfo，说明是编辑/查看模式
  const isViewMode = !!appInfo;
  const currentApp = appInfo || createdApp;

  const handleCreateApp = async () => {
    setLoading(true);
    try {
      const { data } = await postRequest('/guyu.app/create', {
        appName: '傻妞 (GuYu)',
        appDesc: '谷雨时节 · 古语传情',
        appIcon: '/images/avatar/robot.webp',
      });
      setCreatedApp(data);
      setStep(1);
      showToasts(Translate.appCreated, 'success');
      onSuccess?.(data);
    } catch (e: any) {
      showToasts(e.message || '创建失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEnableBot = async () => {
    setLoading(true);
    try {
      await postRequest('/guyu.app/setAppCapability', {
        appId: currentApp!.appId,
        capability: ['bot'],
      });
      setStep(2);
      showToasts(Translate.botEnabled, 'success');
    } catch (e: any) {
      showToasts(e.message || '启用失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 编辑模式：显示应用详情
  if (isViewMode && appInfo) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <Button onClick={onBack}>← 返回应用列表</Button>
        </div>
        
        <div className="text-center mb-8">
          {appInfo.appIcon && (
            <img src={appInfo.appIcon} alt="" className="w-20 h-20 mx-auto mb-4 rounded-full" />
          )}
          <h1 className="text-3xl font-bold mb-3 text-white">{appInfo.appName}</h1>
          <p className="text-gray-300 text-lg">{appInfo.appDesc}</p>
        </div>

        <Card 
          title={<span className="text-white">应用配置</span>}
          className="bg-gray-800 border-gray-600 shadow-xl mb-4"
          headStyle={{ backgroundColor: 'rgb(31 41 55)', borderBottom: '1px solid rgb(75 85 99)' }}
          bodyStyle={{ backgroundColor: 'rgb(31 41 55)' }}
        >
          <div className="space-y-4">
            <div>
              <Text strong className="text-gray-200 text-base">App ID:</Text>
              <Paragraph copyable className="font-mono bg-gray-900 p-3 rounded border border-gray-600 text-gray-100 mt-2">
                {appInfo.appId}
              </Paragraph>
            </div>
            {appInfo.appSecret && (
              <div>
                <Text strong className="text-gray-200 text-base">App Secret:</Text>
                <Paragraph copyable className="font-mono bg-gray-900 p-3 rounded border border-gray-600 mt-2" style={{ color: '#f87171' }}>
                  {appInfo.appSecret}
                </Paragraph>
              </div>
            )}
            <div>
              <Text strong className="text-gray-200 text-base">能力:</Text>
              <div className="mt-2">
                {appInfo.capability.includes('bot') ? (
                  <Alert message="Bot 能力已启用" type="success" showIcon />
                ) : (
                  <Alert message="Bot 能力未启用" type="warning" showIcon />
                )}
              </div>
            </div>
            {appInfo.bot?.callbackUrl && (
              <div>
                <Text strong className="text-gray-200 text-base">回调地址:</Text>
                <Paragraph copyable className="font-mono bg-gray-900 p-3 rounded border border-gray-600 text-gray-100 mt-2">
                  {appInfo.bot.callbackUrl}
                </Paragraph>
              </div>
            )}
          </div>
        </Card>

        {!appInfo.capability.includes('bot') && (
          <Button 
            type="primary" 
            size="large" 
            loading={loading} 
            onClick={handleEnableBot}
            className="px-8 h-12 text-base font-medium"
          >
            {Translate.enableBot}
          </Button>
        )}
      </div>
    );
  }

  // 创建模式：显示创建向导
  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* 标题区域 */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold mb-3 text-white drop-shadow-lg">{Translate.guyuTitle}</h1>
        <p className="text-gray-300 text-lg">{Translate.guyuSubtitle}</p>
      </div>

      {/* 步骤条 */}
      <Steps 
        current={step} 
        className="mb-10 text-gray-400" 
        items={[
          { title: Translate.createApp },
          { title: '保存凭证' },
          { title: Translate.configOpenClaw }
        ]}
      />

      {/* 步骤 0：创建应用 */}
      {step === 0 && (
        <Card 
          title={<span className="text-white">{Translate.createApp}</span>}
          className="bg-gray-800 border-gray-600 shadow-xl"
          headStyle={{ backgroundColor: 'rgb(31 41 55)', borderBottom: '1px solid rgb(75 85 99)' }}
          bodyStyle={{ backgroundColor: 'rgb(31 41 55)' }}
        >
          <p className="mb-6 text-gray-300 text-base">{Translate.createAppDesc}</p>
          <Button 
            type="primary" 
            size="large" 
            loading={loading} 
            onClick={handleCreateApp}
            className="px-8 h-12 text-base font-medium"
          >
            {Translate.createApp}
          </Button>
        </Card>
      )}

      {/* 步骤 1：保存凭证 */}
      {step === 1 && createdApp && (
        <Card 
          title={<span className="text-white">保存凭证</span>}
          className="bg-gray-800 border-gray-600 shadow-xl"
          headStyle={{ backgroundColor: 'rgb(31 41 55)', borderBottom: '1px solid rgb(75 85 99)' }}
          bodyStyle={{ backgroundColor: 'rgb(31 41 55)' }}
        >
          <Alert
            message={Translate.importantNotice}
            description={Translate.importantNoticeDesc}
            type="warning"
            showIcon
            className="mb-6"
          />
          <div className="space-y-5 bg-gray-900 p-5 rounded-lg border border-gray-700">
            <div>
              <Text strong className="text-gray-200 text-base">{Translate.appId}:</Text>
              <Paragraph 
                copyable 
                className="font-mono bg-gray-800 p-3 rounded border border-gray-600 text-gray-100 mt-2"
                style={{ color: '#e5e7eb' }}
              >
                {createdApp.appId}
              </Paragraph>
            </div>
            <div>
              <Text strong className="text-gray-200 text-base">{Translate.appSecret}:</Text>
              <Paragraph 
                copyable 
                className="font-mono bg-gray-800 p-3 rounded border border-gray-600 mt-2"
                style={{ color: '#f87171' }}
              >
                {createdApp.appSecret}
              </Paragraph>
            </div>
          </div>
          <Button 
            type="primary" 
            size="large" 
            loading={loading} 
            onClick={handleEnableBot} 
            className="mt-6 px-8 h-12 text-base font-medium"
          >
            {Translate.enableBot}
          </Button>
        </Card>
      )}

      {/* 步骤 2：配置 OpenClaw */}
      {step === 2 && (
        <Card 
          title={<span className="text-white">{Translate.configOpenClaw}</span>}
          className="bg-gray-800 border-gray-600 shadow-xl"
          headStyle={{ backgroundColor: 'rgb(31 41 55)', borderBottom: '1px solid rgb(75 85 99)' }}
          bodyStyle={{ backgroundColor: 'rgb(31 41 55)' }}
        >
          <Alert
            message="配置成功！"
            description="请在 OpenClaw 的谷雨插件配置中填写以下信息："
            type="success"
            showIcon
            className="mb-6"
          />
          <div className="mt-6 space-y-3 bg-gray-900 p-5 rounded-lg border border-gray-700">
            <p className="text-gray-200">
              <Text strong className="text-gray-300">Tailchat 地址:</Text> 
              <span className="ml-2 font-mono text-gray-100">http://localhost:3000</span>
            </p>
            <p className="text-gray-200">
              <Text strong className="text-gray-300">{Translate.appId}:</Text> 
              <span className="ml-2 font-mono text-gray-100">{createdApp?.appId}</span>
            </p>
            <p className="text-gray-200">
              <Text strong className="text-gray-300">{Translate.appSecret}:</Text> 
              <span className="ml-2 font-mono text-red-400">(刚才复制的密钥)</span>
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};