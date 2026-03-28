import { pathToFileURL } from 'url';
import fs from 'fs';
import path from 'path';

async function test() {
  try {
    const url = pathToFileURL(path.resolve('./server/routers/apkRouter.ts')).href;
    await import(url);
    fs.writeFileSync('diagnostic.txt', "SUCCESS", 'utf8');
  } catch (e: any) {
    fs.writeFileSync('diagnostic.txt', "ERROR:\n" + e.message + "\n\nSTACK:\n" + e.stack, 'utf8');
  }
}
test();
