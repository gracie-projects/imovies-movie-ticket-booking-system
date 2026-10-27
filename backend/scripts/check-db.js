// Tests a MongoDB connection string without printing the password.
// Usage (from backend/):  npm run check-db
// Paste the connection string at the hidden prompt and press Enter.
import mongoose from 'mongoose';
import { describeMongoUri } from '../src/config/uriCheck.js';

function readHidden(question) {
  return new Promise((resolve) => {
    const { stdin, stdout } = process;
    stdout.write(question);
    let value = '';
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === '\r' || char === '\n') {
          stdin.setRawMode?.(false);
          stdin.pause();
          stdin.off('data', onData);
          stdout.write('\n');
          resolve(value);
          return;
        }
        if (char === '\u0003') process.exit(130); // Ctrl+C
        if (char === '\u007f' || char === '\b') value = value.slice(0, -1);
        else value += char;
      }
    };
    stdin.on('data', onData);
  });
}

const uri = process.env.MONGODB_URI_TO_CHECK || (await readHidden('Paste the MongoDB connection string (hidden), then press Enter: '));
const info = describeMongoUri(uri);

console.log('\nConnection string summary (password hidden):');
console.log(`  username : ${info.user ?? '-'}`);
console.log(`  password : ${info.passwordLength ? `${info.passwordLength} characters` : 'MISSING'}`);
console.log(`  host     : ${info.host ?? '-'}`);
console.log(`  database : ${info.database || 'MISSING'}`);
if (info.problems.length) {
  console.log('\nProblems found:');
  for (const problem of info.problems) console.log(`  - ${problem}`);
}

console.log('\nTrying to log in to MongoDB...');
try {
  await mongoose.connect(uri.trim().replace(/^["']|["']$/g, ''), { serverSelectionTimeoutMS: 15000 });
  await mongoose.connection.db.admin().ping();
  console.log('SUCCESS: logged in and the database answered. Use exactly this string as MONGODB_URI on Render.');
  await mongoose.disconnect();
  process.exit(0);
} catch (err) {
  const message = err.message.replace(/\/\/[^@]*@/g, '//***@');
  console.log(`FAILED: ${message}`);
  if (/bad auth|authentication failed/i.test(message)) {
    console.log('  -> Atlas rejected the username/password. Reset the imovies_app password in Atlas (Database Users -> EDIT),');
    console.log('     wait until "deploying your changes" finishes, put the new password in the string, and run this again.');
  } else if (/ENOTFOUND|querySrv/i.test(message)) {
    console.log('  -> The cluster host name is wrong. Copy it again from Atlas -> Clusters -> Connect -> Drivers.');
  } else if (/timed out|Server selection/i.test(message)) {
    console.log('  -> Network blocked. Check Atlas IP Access List contains 0.0.0.0/0 (Active).');
  }
  process.exit(1);
}
