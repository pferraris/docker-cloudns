const dns = require('dns');
const https = require('https');

const token = process.env.CLOUDNS_TOKEN;
const interval = process.env.CLOUDNS_INTERVAL || 30 * 60 * 1000;

function callClouDNSUpdate(token) {
  return new Promise((resolve, reject) => {
    https.get(`https://ipv4.cloudns.net/api/dynamicURL/?q=${token}`, res => {
      if (res.statusCode === 200) {
        try {
          res.setEncoding('utf8');
          let rawData = '';
          res.on('data', (chunk) => { rawData += chunk; });
          res.on('end', () => { resolve(rawData); });
        } catch (err) {
          reject(err);
        }
      } else {
        reject(res.statusCode);
      }
    });
  });
}

function updateIp() {
  callClouDNSUpdate(token).then(response => {
    console.log('ClouDNS response:', response);
  }).catch(err => {
    console.error('Error: ', err);
  });
}

console.log('Daemon started');
process.on('exit', code => { console.log('Daemon stopped. Exit status: ', code); });

if (!token) {
  console.error('Missing token');
  process.exit(1);
} else {
  console.log('Using token:', token);
  console.log('Interval:', interval / 1000, 'seconds');

  updateIp();
  const task = setInterval(updateIp, interval);

  process.on('exit', code => { clearInterval(task); });
}
