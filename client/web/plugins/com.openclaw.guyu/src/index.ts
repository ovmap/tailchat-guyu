import { regCustomPanel, Loadable } from '@capital/common';
import { Translate } from './translate';

const MainPanel = Loadable(() => import('./MainPanel'));

// 注册到设置页面
regCustomPanel({
  position: 'setting',
  icon: '',
  name: 'com.openclaw.guyu/mainPanel',
  label: Translate.guyuSettings,
  render: MainPanel,
});