'use strict';

var TorAgent = require('toragent');
var Promise  = require('bluebird');
var request  = Promise.promisify(require('request'));

function printGoogleHome() {
  return TorAgent.create().then(function(agent) {
    return request({
      url: 'https://www.google.com',
      agent: agent,
    });
  }).spread(function(res, body) {
    console.log(body);
  });
}

printGoogleHome();
