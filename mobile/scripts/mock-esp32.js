const WebSocket = require('ws');
const http = require('http');

const PORT = 8080;
const server = http.createServer();
const wss = new WebSocket.Server({ server });

let sortingInterval = null;
let state = 'STOPPED'; // 'STOPPED', 'RUNNING', 'PAUSED'

// Capstone 2 — single-pass 5-class distribution
const CLASSES = ['Rejected', 'Needs_Drying', 'Criollo', 'Forastero', 'Trinitario'];
const CLASS_WEIGHTS = [0.1, 0.15, 0.2, 0.35, 0.2];
const GATE_MAP = {
  Rejected: 1,
  Needs_Drying: 2,
  Criollo: 3,
  Forastero: 4,
  Trinitario: 5,
};
const GRADE_MAP = {
  Rejected: 'Defect / Reject',
  Needs_Drying: 'High Moisture',
  Criollo: 'Export Grade',
  Forastero: 'Export Grade',
  Trinitario: 'Export Grade',
};

function weightedRandom(items, weights) {
  let r = Math.random();
  for (let i = 0; i < weights.length; i++) {
    if (r < weights[i]) return items[i];
    r -= weights[i];
  }
  return items[items.length - 1];
}

console.log('🤖 CacaoScan Mock ESP32 Hardware Simulator starting (5-class)...');

wss.on('connection', (ws) => {
  console.log('📱 Mobile app connected to ESP32 simulator');

  ws.send(JSON.stringify({ type: 'STATUS', state }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('📥 Received command:', data);

      if (data.command === 'START') {
        state = 'RUNNING';
        ws.send(JSON.stringify({ type: 'STATUS', state }));

        if (!sortingInterval) {
          sortingInterval = setInterval(() => {
            if (state === 'RUNNING') {
              const operational_class = weightedRandom(CLASSES, CLASS_WEIGHTS);
              const confidence = 0.8 + Math.random() * 0.19;
              const beanEvent = {
                type: 'BEAN_DETECTED',
                timestamp: new Date().toISOString(),
                data: {
                  operational_class,
                  confidence,
                  gate_actuated: GATE_MAP[operational_class],
                  derived_grade: GRADE_MAP[operational_class],
                  model_version: 'YOLOv8n-640-mock',
                },
              };
              console.log('📤 Emitting bean:', operational_class, Math.round(confidence * 100) + '%');
              ws.send(JSON.stringify(beanEvent));
            }
          }, Math.random() * 1000 + 500);
        }
      } else if (data.command === 'PAUSE') {
        state = 'PAUSED';
        ws.send(JSON.stringify({ type: 'STATUS', state }));
      } else if (data.command === 'STOP') {
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

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ Mock ESP32 Server running on ws://0.0.0.0:${PORT}`);
  console.log('   Local:  ws://127.0.0.1:' + PORT);
  console.log('   Phone:  set AI Server to this PC LAN IP, then Connect.');
  console.log('Send commands {command: "START"|"PAUSE"|"STOP"} to control the flow.\n');
});
