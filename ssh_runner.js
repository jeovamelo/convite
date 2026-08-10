const { exec } = require('child_process');

const command = process.argv[2];

exec(`ssh -o StrictHostKeyChecking=no root@2.25.183.40 "${command.replace(/"/g, '\\"')}"`, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`Stderr: ${stderr}`);
  }
  console.log(stdout);
});
