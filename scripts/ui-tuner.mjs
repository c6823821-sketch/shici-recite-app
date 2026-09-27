import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const root = path.resolve(process.cwd());
const htmlPath = path.join(root, 'tools', 'ui-tuner.html');
const savePath = path.join(root, 'ui-tuning.json');
const port = 4310;
const url = 'http://127.0.0.1:' + port;

function send(response, status, body, type = 'text/plain; charset=utf-8') {
  response.writeHead(status, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*' });
  response.end(body);
}

const server = http.createServer((request, response) => {
  if (request.method === 'GET' && request.url === '/') {
    send(response, 200, fs.readFileSync(htmlPath, 'utf8'), 'text/html; charset=utf-8');
    return;
  }
  if (request.method === 'GET' && request.url === '/api/config') {
    const body = fs.existsSync(savePath) ? fs.readFileSync(savePath, 'utf8') : '{}';
    send(response, 200, body, 'application/json; charset=utf-8');
    return;
  }
  if (request.method === 'POST' && request.url === '/api/save') {
    let body = '';
    request.on('data', (chunk) => { body += chunk; });
    request.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        fs.writeFileSync(savePath, JSON.stringify(parsed, null, 2) + '\n', 'utf8');
        send(response, 200, JSON.stringify({ ok: true }), 'application/json; charset=utf-8');
      } catch (error) {
        send(response, 400, JSON.stringify({ ok: false, error: String(error) }), 'application/json; charset=utf-8');
      }
    });
    return;
  }
  send(response, 404, 'not found');
});

server.listen(port, '127.0.0.1', () => {
  console.log('UI tuner: ' + url);
  if (process.platform === 'win32') {
    const child = spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' });
    child.unref();
  }
});
