const exec = require('child_process').exec;
const fs = require('fs');

const _ = require('lodash');
const getPort = require('get-port');

const crawlerHandler = require('crawlerHandler');
const logger = require('logger');
const config = require('config');

//setup
killOldProcesses();
clearMemory();
clearTempFiles();

//run applicaton instances
setTimeout(launchAppInstances, config.preRunWaitingTime);

function killOldProcesses() {
    logger.debug('Killing old processes, may taka a while...');
    exec('killall tor');
    exec('killall phantomjs');
}

function clearMemory() {
    exec('sync; echo 1 > /proc/sys/vm/drop_caches');
}

function clearTempFiles() {
    exec('rm -rf ./temp/*');
}

function launchAppInstances() {
    _.times(config.torClientsAmount, launchApp)
}

function getFreePort() {
    return getPort().then(port => port);
}

function getTorTempDir() {
    return new Promise(resolve => {
        fs.mkdtemp(config.torTempDirPathPreFix, (err, folder) => resolve(folder));
    });
}

function spawnTor(port, dir) {
    return new Promise(function(resolve, reject) {

        const tor = exec(`tor --SocksPort ${port} --DataDirectory ${dir}`);

        tor.stdout.on('data', function(data) {
            logger.debug(data);

            const regexConnected = /100%:\s\Done/;
            const regexParallerTor = /Could\snot\sbind/;

            if(regexConnected.test(data)) {
               logger.info('TOR client connected.');
               resolve();
            }
            if (regexParallerTor.test(data)) {
               reject('TOR fail - parallel connection?');
            }
          });
    });
}

function spawnCrawlers(port) {
    _.times(config.phantomJsPerTorClientAmount, () => crawlerHandler.spawn(port))
}

function launchApp() {
    Promise
        .all([getFreePort(), getTorTempDir()])
        .then(values => {
            spawnTor(...values);
            return values[0]; //port
        })
        .then(port => spawnCrawlers(port))
        .catch(e => {
            logger.error(e);
            process.exit(1);
        });
}
