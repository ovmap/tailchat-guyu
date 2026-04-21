/**
 * 检查 GuYu 插件服务状态
 */

const { ServiceBroker } = require('moleculer');

async function checkServices() {
  console.log('🔍 检查 Tailchat 服务...\n');

  const broker = new ServiceBroker({
    nodeID: 'guyu-checker',
    transporter: 'redis://:8tuWqoi33s4kvTHm@43.248.79.29:16315/',
    logger: false,
    logLevel: 'error',
  });

  try {
    await broker.start();
    console.log('✅ 已连接到 Tailchat 网络\n');

    // 等待所有服务
    await broker.waitForServices(['gateway', 'chat.message'], 5000);

    // 获取本地节点信息
    const nodeInfo = await broker.getLocalNodeInfo();
    
    console.log('📋 本地节点注册的服务:\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const allServices = nodeInfo.services || [];
    console.log(`总共 ${allServices.length} 个服务\n`);
    
    // 查找 GuYu 相关服务
    const guyuServices = allServices.filter(s => 
      s.name && (s.name.includes('guyu') || s.name.includes('openclaw'))
    );
    
    if (guyuServices.length > 0) {
      console.log('✅ 找到 GuYu 相关服务:\n');
      guyuServices.forEach(service => {
        console.log(`  服务名：${service.name}`);
        console.log(`  版本：${service.version || 'N/A'}`);
        if (service.actions) {
          console.log(`  Actions (${Object.keys(service.actions).length}):`);
          Object.keys(service.actions).forEach(action => {
            console.log(`    • ${action}`);
          });
        }
        console.log('');
      });
    } else {
      console.log('❌ 未找到 GuYu 相关服务！\n');
      console.log('可能原因:');
      console.log('  1. 插件未正确加载');
      console.log('  2. 插件名称不匹配');
      console.log('  3. 插件启动失败\n');
    }
    
    // 显示所有服务名称（前 20 个）
    console.log('📝 所有服务名称 (前 20 个):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    allServices.slice(0, 20).forEach(s => {
      console.log(`  - ${s.name}`);
    });
    if (allServices.length > 20) {
      console.log(`  ... 还有 ${allServices.length - 20} 个服务`);
    }
    console.log('');

  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  } finally {
    await broker.stop();
    process.exit(0);
  }
}

checkServices();
