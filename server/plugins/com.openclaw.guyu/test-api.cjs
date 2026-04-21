/**
 * GuYu HTTP API 测试脚本
 * 测试 HTTP API 端点
 */

const http = require('http');

console.log('🌧️  GuYu HTTP API 测试\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// 测试配置
const config = {
  host: 'localhost',
  port: 11000,
  appId: 'cli_test_001',
  appSecret: 'test_secret_001',
};

/**
 * 发送 HTTP 请求
 */
function httpRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });
    
    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function runTests() {
  // 测试 1: 获取租户令牌
  console.log('📝 测试 1: 获取租户令牌');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    const result = await httpRequest({
      hostname: config.host,
      port: config.port,
      path: '/open-apis/auth/v3/tenant_access_token/internal',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    }, {
      app_id: config.appId,
      app_secret: config.appSecret
    });
    
    console.log('✅ 响应:', JSON.stringify(result.data, null, 2));
  } catch (error) {
    console.log('❌ 失败:', error.message);
  }
  console.log('');
  
  // 测试 2: WebSocket 端点注册
  console.log('📝 测试 2: WebSocket 端点注册');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    const result = await httpRequest({
      hostname: config.host,
      port: config.port,
      path: '/callback/ws/endpoint',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Log-Id': `log-${Date.now()}`
      }
    }, {
      AppID: config.appId,
      AppSecret: config.appSecret
    });
    
    console.log('✅ 响应:', JSON.stringify(result.data, null, 2));
  } catch (error) {
    console.log('❌ 失败:', error.message);
  }
  console.log('');
  
  // 测试 3: 发送消息
  console.log('📝 测试 3: 发送消息');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    const result = await httpRequest({
      hostname: config.host,
      port: config.port,
      path: '/open-apis/im/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    }, {
      receive_id: 'oc_test_001',
      msg_type: 'text',
      content: JSON.stringify({ text: '你好，这是 GuYu 测试消息！' })
    });
    
    console.log('✅ 响应:', JSON.stringify(result.data, null, 2));
  } catch (error) {
    console.log('❌ 失败:', error.message);
  }
  console.log('');
  
  console.log('🎉 测试完成！\n');
  process.exit(0);
}

// 运行测试
runTests().catch(console.error);
