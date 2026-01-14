import { exec } from 'child_process';
import fs from 'fs';

console.log("Starting build debug...");
exec('npx electron-builder build --win', (error, stdout, stderr) => {
    if (error) {
        console.error(`exec error: ${error}`);
        const log = `ERROR:\n${error.message}\n\nSTDERR:\n${stderr}\n\nSTDOUT:\n${stdout}`;
        fs.writeFileSync('debug_log.txt', log);
    } else {
        console.log('Build success!');
        fs.writeFileSync('debug_log.txt', "SUCCESS\n" + stdout);
    }
});
