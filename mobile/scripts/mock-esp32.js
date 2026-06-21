const WebSocket = require('ws');
const http = require('http');

const PORT = 8080;
const server = http.createServer();
const wss = new WebSocket.Server({ server });

let sortingInterval = null;
let state = 'STOPPED'; // 'STOPPED', 'RUNNING', 'PAUSED'

// Bean distribution settings for realistic simulation
const VARIETIES = ['criollo', 'forastero', 'trinitario'];
const QUALITIES = ['export_grade', 'needs_drying', 'rejected'];
const VARIETY_WEIGHTS = [0.2, 0.5, 0.3]; // Forastero is most common
const QUALITY_WEIGHTS = [0.7, 0.2, 0.1]; // Mostly export grade

function weightedRandom(items, weights) {
  let r = Math.random();
  for (let i = 0; i < weights.length; i++) {
    if (r < weights[i]) return items[i];
    r -= weights[i];
  }
  return items[items.length - 1];
}

console.log('🤖 CacaoScan Mock ESP32 Hardware Simulator starting...');

wss.on('connection', (ws) => {
  console.log('📱 Mobile app connected to EPS32 simulator');
  
  // Send initial state
  ws.send(JSON.stringify({ type: 'STATUS', state }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('📥 Received command:', data);

      if (data.command === 'START') {
        state = 'RUNNING';
        ws.send(JSON.stringify({ type: 'STATUS', state }));
        
        // Start emitting beans
        if (!sortingInterval) {
          sortingInterval = setInterval(() => {
            if (state === 'RUNNING') {
              const beanEvent = {
                type: 'BEAN_DETECTED',
                timestamp: new Date().toISOString(),
                data: {
                  variety: weightedRandom(VARIETIES, VARIETY_WEIGHTS),
                  variety_confidence: 85 + Math.random() * 14, // 85-99%
                  quality: weightedRandom(QUALITIES, QUALITY_WEIGHTS),
                  quality_confidence: 80 + Math.random() * 19, // 80-99%
                }
              };
              console.log('📤 Emitting bean:', beanEvent.data.variety, beanEvent.data.quality);
              ws.send(JSON.stringify(beanEvent));
            }
          }, Math.random() * 1000 + 500); // 1-3 beans per second roughly (500-1500ms)
        }
      } 
      else if (data.command === 'PAUSE') {
        state = 'PAUSED';
        ws.send(JSON.stringify({ type: 'STATUS', state }));
      }
      else if (data.command === 'STOP') {
        state = 'STOPPED';
        ws.send(JSON.stringify({ type: 'STATUS', state }));
        if (sortingInterval) {
          clearInterval(sortingInterval);
          sortingInterval = null;
        }
      }
    } catch (e) {
      console.error('Failed to parse message:', message.toString());
    }
  });

  ws.on('close', () => {
    console.log('📱 Mobile app disconnected');
    if (sortingInterval) {
      clearInterval(sortingInterval);
      sortingInterval = null;
    }
    state = 'STOPPED';
  });
});

server.listen(PORT, () => {
  console.log(`\n✅ Mock ESP32 Server running on ws://localhost:${PORT}`);
  console.log('Send commands {command: "START"|"PAUSE"|"STOP"} to control the flow.\n');
});
