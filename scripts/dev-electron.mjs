import { spawn } from 'node:child_process';

const vite = spawn('npm', ['run', 'dev'], {
  env: { ...process.env },
  stdio: 'inherit',
  shell: true,
});

const shutdown = () => {
  vite.kill('SIGTERM');
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('exit', shutdown);

const waitForServer = async (attempts = 60) => {
  for (let index = 0; index < attempts; index += 1) {
    try {
      const response = await fetch('http://127.0.0.1:3000');
      if (response.ok) {
        return;
      }
    } catch {
      // ponytail: single polling loop is enough until startup gets more complex.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error('Vite dev server did not start on http://127.0.0.1:3000');
};

await waitForServer();

const electron = spawn('npx', ['electron', '.'], {
  env: {
    ...process.env,
    VITE_DEV_SERVER_URL: 'http://127.0.0.1:3000',
  },
  stdio: 'inherit',
  shell: true,
});

electron.on('exit', (code) => {
  shutdown();
  process.exit(code ?? 0);
});
