import { Runner } from 'moleculer';
import path from 'path';

const runner = new Runner();
runner.flags = {
  config: path.resolve(process.cwd(), 'moleculer.config.js'),
  hot: false,
  repl: false,
  env: true,
};
runner.servicePaths = ['services/**/*.service.js', 'plugins/**/*.service.js'];

// Use _run() instead of start() to avoid command line parsing overriding our settings
runner._run();
