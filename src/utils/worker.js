const portList = []; // 存储端口
const visiblePorts = []; //存储页面可见情况
let intervalId = null;
// eslint-disable-next-line no-undef
onconnect = function (e) {
  const port = e.ports[0];
  port.id = generateUUID();
  // 存储端口
  portList.push(port);
  // 监听port推送
  port.onmessage = async function (e) {
    // 取数据
    const data = e.data || {};
    const type = data.type || '';
    switch (type) {
      case 'start': //开启轮询
        //防止重复添加
        if (!visiblePorts.find((o) => o === port.id)) {
          visiblePorts.push(port.id);
        }
        if (intervalId !== null) {
          clearInterval(intervalId);
        }
        intervalId = setInterval(() => {
          getETag().then((res) => {
            broadcast({
              type: 'reflectGetEtag',
              data: res,
            });
          });
        }, 30000);
        break;
      case 'stop': //停止轮询
      {
        const visibleIndex = visiblePorts.indexOf(port.id);
        if (visibleIndex > -1) visiblePorts.splice(visibleIndex, 1);
      }
        //当所有页面不可见时，才停止轮询
        if (intervalId !== null && visiblePorts.length === 0) {
          clearInterval(intervalId);
          intervalId = null;
        }
        break;
      case 'close': //关闭当前端口
      {
        const index = portList.indexOf(port);
        if (index > -1) {
          portList.splice(index, 1);
        }
      }
        break;
      case 'refresh': //主动刷新，通知其他页面刷新
        sendMessage(port, {
          type: 'reflectRefresh',
        });
        break;
      default:
        broadcast({ type: 'error', message: 'Unknown message type' });
        break;
    }
  };
};
//给除自己外的窗口发送消息
function sendMessage(port, message) {
  portList.forEach((o) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    o.id !== port.id && o.postMessage(message);
  });
}
// 给所有窗口发送消息
function broadcast(message) {
  portList.forEach((port) => {
    port.postMessage(message);
  });
}
// 使用函数生成一个UUID
function generateUUID() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}
// 获取当前etag
const getETag = async () => {
  try {
    const response = await fetch(location.origin, {
      method: 'HEAD',
      cache: 'no-cache',
    });
    return response.headers.get('etag') || response.headers.get('last-modified');
  } catch (error) {
    throw new Error(`Fetch failed: ${error.message}`);
  }
};
