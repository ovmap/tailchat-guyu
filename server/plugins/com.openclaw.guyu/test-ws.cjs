/**
 * GuYu WebSocket 测试脚本
 * 测试 WebSocket 连接和消息推送
 */

const WebSocket = require('ws');

// 测试配置
const config = {
  appId: 'cli_test_001',
  appSecret: 'test_secret_001',
  wsUrl: 'ws://localhost:11000/v3/im/ws',
};

console.log('🌧️  GuYu WebSocket 测试\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// 构建 WebSocket URL
const wsUrl = `${config.wsUrl}?app_id=${config.appId}&app_secret=${config.appSecret}`;
console.log('📡 连接信息:');
console.log(`   URL: ${wsUrl}\n`);

// 创建 WebSocket 连接
const ws = new WebSocket(wsUrl);

ws.on('open', () => {
  console.log('✅ WebSocket 连接成功\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
});

ws.on('message', (data) => {
  console.log('📨 收到消息:');
  console.log(`   原始数据长度：${data.length} bytes`);
  
  try {
    // 尝试解析为 JSON（握手消息）
    const json = JSON.parse(data.toString());
    console.log('   解析结果:', JSON.stringify(json, null, 2));
  } catch (e) {
    // 可能是 protobuf 编码
    console.log('   ⚠️  无法解析为 JSON，可能是 protobuf 编码');
    console.log(`   前 100 字节：${data.toString('hex').substring(0, 100)}...`);
  }
  
  console.log('');
});

ws.on('ping', () => {
  console.log('💓 收到 WebSocket ping\n');
});

ws.on('pong', () => {
  console.log('💚 收到 WebSocket pong\n');
});

ws.on('close', (code, reason) => {
  console.log('🔌 WebSocket 连接关闭');
  console.log(`   代码：${code}`);
  console.log(`   原因：${reason.toString()}\n`);
});

ws.on('error', (error) => {
  console.error('❌ WebSocket 错误:');
  console.error(`   ${error.message}\n`);
});

// 5 秒后发送测试 ping
setTimeout(() => {
  if (ws.readyState === WebSocket.OPEN) {
    console.log('📤 发送测试 ping...\n');
    
    // 发送 JSON ping（简单测试）
    ws.send(JSON.stringify({
      type: 'ping',
      timestamp: Date.now()
    }));
  }
}, 5000);

// 30 秒后关闭
setTimeout(() => {
  if (ws.readyState === WebSocket.OPEN) {
    console.log('👋 测试完成，关闭连接\n');
    ws.close();
  }
  process.exit(0);
}, 30000);

console.log('⏳ 等待连接...\n');
