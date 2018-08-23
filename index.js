const dns = require('dns');
const https = require('https');

const domain = process.env.CLOUDNS_DOMAIN; 
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

function getCurrentIP(domain) {
  return new Promise((resolve, reject) => {
    dns.lookup(domain, (err, currentIp) => {
      if (err) {
        reject(err);
      } else {
        resolve(currentIp);
      }
    });
  });
}

function getRealIP() {
  return new Promise((resolve, reject) => {
    https.get('https://api.ipify.org/', res => {
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

function updateIP() {
  console.log('-'.repeat(50));
  console.log('Starting UpdateIP process...');
  getRealIP().then(realIP => {
    console.log(`Real IP is ${realIP}`);
    return getCurrentIP(domain).then(currentIP => {
      console.log(`Current IP for ${domain} is ${currentIP}`);
      if (currentIP !== realIP) {
        return callClouDNSUpdate(token).then(response => {
          console.log(`IP ${realIP} updated successfully for ${domain}: ${response}`);
        });
      } else {
        console.log(`Update no needed for ${domain}`);
      }
    });
  }).catch(err=> {
    console.error('Error: ', err);
  }).finally(() => {
    console.log('UpdateIP process finished');
  });
}

console.log('Daemon started');
process.on('exit', code => { console.log('Daemon stopped. Exit status: ', code); });

if (!domain) {
  console.error('Missing domain');
  process.exit(1);
} else if (!token) {
  console.error('Missing token');
  process.exit(1);
} else {
  console.log('Domain:', domain);
  console.log('Token:', token);
  console.log('Interval:', interval / 1000, 'seconds');

  updateIP();
  const task = setInterval(updateIP, interval);

  process.on('exit', () => { clearInterval(task); });
}
