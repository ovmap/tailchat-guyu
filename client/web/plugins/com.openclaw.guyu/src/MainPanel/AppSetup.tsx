import React, { useState } from 'react';
import { Button, Divider, FullModalField } from '@capital/component';
import { postRequest, showToasts, copyToClipboard } from '@capital/common';
import { Translate } from '../translate';
import type { GuyuApp } from './useGuyuAppList';

interface AppSetupProps {
  appInfo?: GuyuApp | null;
  onBack?: () => void;
  onSuccess?: (app: GuyuApp) => void;
}

export const AppSetup: React.FC<AppSetupProps> = ({
  appInfo,
  onBack,
  onSuccess,
}) => {
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

  const handleCopy = (text: string, label: string) => {
    copyToClipboard(text);
    showToasts(`${label} 已复制`, 'success');
  };

  // 编辑模式：显示应用详情
  if (isViewMode && appInfo) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <Button onClick={onBack}>← 返回应用列表</Button>
        </div>

        <div className="text-center mb-8">
          {appInfo.appIcon && (
            <img
              src={appInfo.appIcon}
              alt=""
              className="w-20 h-20 mx-auto mb-4 rounded-full"
            />
          )}
          <h1 className="text-3xl font-bold mb-3">{appInfo.appName}</h1>
          <p className="text-gray-500 text-lg">{appInfo.appDesc}</p>
        </div>

        <h2 className="text-xl font-semibold mb-4">应用配置</h2>

        <FullModalField
          title="App ID"
          content={
            <div className="font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded inline-block">
              {appInfo.appId}
            </div>
          }
        />

        {appInfo.appSecret && (
          <FullModalField
            title="App Secret"
            content={
              <div className="font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded text-red-500 inline-block">
                {appInfo.appSecret}
              </div>
            }
          />
        )}

        <Divider />

        <div className="mb-4">
          <strong>能力:</strong>
          <div className="mt-2 p-3 rounded bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
            ✓ Bot 能力已启用
          </div>
        </div>

        {!appInfo.capability.includes('bot') && (
          <div className="mb-4 p-3 rounded bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
            ⚠ Bot 能力未启用
          </div>
        )}

        {appInfo.bot?.callbackUrl && (
          <FullModalField
            title="回调地址"
            content={
              <div className="font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded inline-block">
                {appInfo.bot.callbackUrl}
              </div>
            }
          />
        )}

        {!appInfo.capability.includes('bot') && (
          <div className="mt-6">
            <Button type="primary" loading={loading} onClick={handleEnableBot}>
              {Translate.enableBot}
            </Button>
          </div>
        )}
      </div>
    );
  }

  // 创建模式：显示创建向导
  return (
    <div className="p-6">
      {/* 标题区域 */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold mb-3">{Translate.guyuTitle}</h1>
        <p className="text-gray-500 text-lg">{Translate.guyuSubtitle}</p>
      </div>

      {/* 步骤指示 */}
      <div className="flex justify-center mb-10 space-x-4">
        {['创建应用', '保存凭证', '配置 OpenClaw'].map((label, index) => (
          <div
            key={index}
            className={`px-4 py-2 rounded ${
              step === index
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            {index + 1}. {label}
          </div>
        ))}
      </div>

      {/* 步骤 0：创建应用 */}
      {step === 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">{Translate.createApp}</h2>
          <p className="mb-6 text-gray-600 dark:text-gray-400">
            {Translate.createAppDesc}
          </p>
          <Button type="primary" loading={loading} onClick={handleCreateApp}>
            {Translate.createApp}
          </Button>
        </div>
      )}

      {/* 步骤 1：保存凭证 */}
      {step === 1 && createdApp && (
        <div>
          <div className="mb-6 p-4 rounded bg-yellow-100 dark:bg-yellow-900 border-l-4 border-yellow-500">
            <strong className="block mb-2">⚠ 重要提示</strong>
            <p className="text-sm">
              请妥善保存您的 App Secret，关闭页面后将无法再次查看！
            </p>
          </div>

          <h2 className="text-xl font-semibold mb-4">保存凭证</h2>

          <div className="space-y-4 bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
            <div>
              <strong className="block mb-2">{Translate.appId}:</strong>
              <div
                className="font-mono bg-white dark:bg-gray-900 p-3 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => handleCopy(createdApp.appId, 'App ID')}
              >
                {createdApp.appId}
              </div>
            </div>
            <div>
              <strong className="block mb-2">{Translate.appSecret}:</strong>
              <div
                className="font-mono bg-white dark:bg-gray-900 p-3 rounded text-red-500 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() =>
                  handleCopy(createdApp.appSecret || '', 'App Secret')
                }
              >
                {createdApp.appSecret}
              </div>
            </div>
          </div>

          <Button
            type="primary"
            loading={loading}
            onClick={handleEnableBot}
            className="mt-6"
          >
            {Translate.enableBot}
          </Button>
        </div>
      )}

      {/* 步骤 2：配置 OpenClaw */}
      {step === 2 && (
        <div>
          <div className="mb-6 p-4 rounded bg-green-100 dark:bg-green-900 border-l-4 border-green-500">
            <strong className="block mb-2">✓ 配置成功！</strong>
            <p className="text-sm">
              请在 OpenClaw 的谷雨插件配置中填写以下信息：
            </p>
          </div>

          <h2 className="text-xl font-semibold mb-4">
            {Translate.configOpenClaw}
          </h2>

          <div className="mt-6 space-y-3 bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
            <p>
              <strong>Tailchat 地址:</strong>
              <span className="ml-2 font-mono">http://localhost:3000</span>
            </p>
            <p>
              <strong>{Translate.appId}:</strong>
              <span className="ml-2 font-mono">{createdApp?.appId}</span>
            </p>
            <p>
              <strong>{Translate.appSecret}:</strong>
              <span className="ml-2 font-mono text-red-500">
                (刚才复制的密钥)
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
