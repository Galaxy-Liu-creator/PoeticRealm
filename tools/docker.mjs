import { randomBytes } from 'node:crypto';
import { writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envFile = resolve(root, '.env.docker');
function docker(args, quiet = false) {
  const result = spawnSync('docker', args, { cwd: root, stdio: quiet ? 'pipe' : 'inherit', shell: false });
  if (result.error) throw new Error('Docker 未安装或未加入 PATH。请先安装 Docker Desktop。');
  return result.status ?? 1;
}
function compose(args) {
  if (docker(['compose', '--env-file', envFile, ...args])) throw new Error('Docker Compose 执行失败，请检查上方日志。');
}
try {
  const command = process.argv[2] ?? 'up';
  if (!['up', 'status', 'logs', 'stop', 'down'].includes(command)) throw new Error('用法：node tools/docker.mjs up|status|logs|stop|down');
  if (command === 'up') {
    if (docker(['info'], true)) {
      if (docker(['desktop', 'start', '--timeout', '120']) || docker(['info'], true)) throw new Error('Docker 引擎未就绪，请启动 Docker Desktop 后重试。');
    }
    if (!existsSync(envFile)) {
      const secret = () => randomBytes(32).toString('hex');
      writeFileSync(envFile, `DB_PASSWORD=${secret()}\nDB_ROOT_PASSWORD=${secret()}\nREMEMBER_ME_KEY=${secret()}\nPOETIC_PORT=5173\nCOOKIE_SECURE=false\n`, { flag: 'wx', mode: 0o600 });
      console.log('已生成本机 .env.docker；请保留此文件，后续启动会沿用。');
    }
    compose(['config', '--quiet']);
    compose(['up', '-d', '--build', '--wait', '--wait-timeout', '240']);
    const address = spawnSync('docker', ['compose', '--env-file', envFile, 'port', 'frontend', '8080'], { cwd: root, encoding: 'utf8', shell: false });
    console.log(`诗境已启动：http://${address.stdout.trim()}`);
  } else {
    if (!existsSync(envFile)) throw new Error('请先执行 node tools/docker.mjs up。');
    compose(command === 'status' ? ['ps'] : command === 'logs' ? ['logs', '--tail', '100'] : [command]);
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
