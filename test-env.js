import { build } from 'vite';
import fs from 'fs';

async function test() {
  await build({
    root: '.',
    build: {
      write: false,
    },
    define: {
      'process.env.TEST_UNDEF': undefined,
      'process.env.TEST_NULL': null,
      'process.env.TEST_STR': '"hello"'
    }
  });
}
test();
