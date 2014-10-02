var util = require('util');
var net = require("net");

process.on("uncaughtException", function(e) {
  app.log('UNCAUGHT EXCEPTION!!111');
  app.log(e.message);
  app.log(e.stack);
});

if (!process.env.OPENSHIFT_NODEJS_PORT && process.argv.length != 5) {
  console.log("Require the following command line arguments:" +
    " proxy_port service_host service_port");
  console.log(" e.g. 9001 www.google.com 80");
  process.exit();
}

var proxyPort = process.env.OPENSHIFT_NODEJS_PORT || process.argv[2];
var serviceHost = process.argv[3] || 'chat.freenode.net';
var servicePort = process.argv[4] || 6667;
var ip = process.env.OPENSHIFT_NODEJS_IP;

var app = {
  log: function(str) {
    console.log('[%s]: ' + str, new Date().toISOString());
  }
};
var server = net.createServer(function(proxySocket) {
  var connected = false;
  var buffers = [];
  var serviceSocket = new net.Socket();
  app.log(util.format('New socket connected from IP %s', proxySocket.remoteAddress));
  serviceSocket.connect(parseInt(servicePort, 10), serviceHost, function() {
    connected = true;
    var str = 'Connected to service at host %s, port %d';
    app.log(util.format(str, serviceHost, servicePort));
    if (buffers.length > 0) {
      for (i = 0; i < buffers.length; i++) {
        console.log(buffers[i]);
        serviceSocket.write(buffers[i]);
      }
    }
  });
  proxySocket.on('error', function (e) {
    app.log(util.format('Proxysocket error: %s', e.message));
    app.log('---');
    app.log(e.stack);
    serviceSocket.end();
  });
  serviceSocket.on('error', function (e) {
    var str = 'Could not connect to service at host %s, port %d';
    app.log(util.format(str, serviceHost, servicePort));
    app.log('serviceSocket error: %s', e.message);
    app.log('---');
    app.log(e.stack);
    proxySocket.end();
  });
  proxySocket.on('data', function (data) {
    if (connected) {
      serviceSocket.write(data);
    } else {
      buffers[buffers.length] = data;
    }
  });
  serviceSocket.on('data', function(data) {
    proxySocket.write(data);
  });
  proxySocket.on('close', function(had_error) {
    app.log('Proxysocket closed');
    app.log(util.format('Had error: %s', had_error));
    serviceSocket.end();
  });
  serviceSocket.on('close', function(had_error) {
    app.log('serviceSocket closed');
    app.log(util.format('Had error: %s', had_error));
    proxySocket.end();
  });
});

server.listen(proxyPort, function() {
  app.log('Server started');
});
