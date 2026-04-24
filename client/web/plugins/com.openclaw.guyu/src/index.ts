import { regCustomPanel, regPluginRootRoute, Loadable } from '@capital/common';
import { Translate } from './translate';

console.log('[GuYu Plugin] Plugin is loading...');

const MainPanel = Loadable(() => import('./MainPanel'), {
  componentName: 'com.openclaw.guyu:MainPanel',
});

console.log('[GuYu Plugin] MainPanel loaded');

// 注册到设置页面
regCustomPanel({
  position: 'setting',
  icon: 'mdi:robot',
  name: 'com.openclaw.guyu/mainPanel',
  label: Translate.guyuSettings,
  render: MainPanel,
});

console.log('[GuYu Plugin] Custom panel registered');

// 注册根路由（用于直接访问）
regPluginRootRoute({
  name: 'com.openclaw.guyu/route',
  path: '/guyu',
  component: MainPanel,
});

console.log('[GuYu Plugin] Root route registered');
