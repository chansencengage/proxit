var log = require('../util/logger'),
    _ = require('lodash'),
    converter = require('../url/converter'),
    events = {
        'default': [],
        'internal.response.headers': []
    },
    URL = require('url'),
    http = require('http'),
    https = require('https');

httpAgent = new http.Agent();
httpAgent.maxSockets = 20;
httpsAgent = new https.Agent();
httpsAgent.maxSockets = 20;

var proxy = module.exports = function(route, endpoint) {
    route = route || '/';

    var to = URL.parse(endpoint),
        request = to.protocol === 'https:' ? https.request : http.request,
        agent = to.protocol === 'https:' ? httpsAgent : httpAgent;

    return function(req, res, next) {
        var opts = converter.convert(req.route || route, req.url, to.href);

        opts.method = req.method;
        opts.headers = to.headers ? _.extend(req.headers, to.headers) : req.headers;
        // make sure we use our agent
        opts.agent = agent;

        events['default'].forEach(function(interceptor) {
            interceptor(req, res, opts);
        });

        var end = res.end;

        req.on('error', function(err) {
            log.error('External request error:', err.message);
            next(err);
        });

        res.on('error', function(err) {
            log.error('External response error:', err.message);
            next(err);
        });

        res.end = function() {
            log.verbose.http(req, res, opts.href + ' (' + req.url + ')');
            return end.apply(this, arguments);
        };

        var myReq = request(opts, function(myRes) {
            events['internal.response.headers'].forEach(function(interceptor) {
                interceptor(req, res, myRes.headers);
            });

            var headers = _.merge(myRes.headers, res._headers, function(a, b) {
                return _.isArray(a) ? a.concat(b) : undefined;
            });

            res.writeHead(myRes.statusCode, headers);

            myRes.on('error', function(err) {
                log.error('Internal response error:', err.message);
                next(err);
            });

            myRes.pipe(res);
        });

        var mySocket;

        myReq.on('socket', function(socket) {
            mySocket = socket;

            socket.setNoDelay(true);
            socket.setTimeout(0);
            socket.setKeepAlive(true);
        });

        myReq.on('error', function(err) {
            if (err.code === 'ECONNRESET') {
                // Treat this like a close even if less than graceful...
            } else {
                log.error('Internal request error:', err.message);
                next(err);
            }
        });

        myReq.on('end', function() {
            mySocket.unref();
        });

        if (req.readable) {
            req.pipe(myReq);

            req.on('end', function() {
                myReq.end();
            });
        } else if (req.rawBody) {
            myReq.end(req.rawBody);
        } else {
            log.error('Encountered unreadable request!');
            myReq.end();
        }
    };
};

proxy.setMaxSockets = function(maxSockets) {
    httpAgent.maxSockets = httpsAgent.maxSockets = maxSockets;
};

proxy.addInterceptor = function(cb, event) {
    event = event || 'default';

    var callbacks = events[event];

    if (!callbacks) {
        callbacks = events[event] = [];
    }

    callbacks.push(cb);
};
