'use strict';

var async    = require('async');
var chalk    = require('chalk');
var process  = require('process');
var Crawler  = require('simplecrawler');
var URL      = require('url');

// Set the crawler.
var crawler            = new Crawler();
crawler.interval       = 50;
crawler.maxConcurrency = 5;
crawler.filterByDomain = true;
crawler.timeout        = 10 * 1000;
crawler.userAgent      = 'liip/a11ym';

var filterByUrls  = null;
var excludeByUrls = null;

var maximumUrls = 0;

var testQueue = null;

// Each URL is dispatched in a specific bucket. So far, a bucket is defined as
// the first part of the pathname. For instance let's consider the `/a/b/c` URL;
// its bucket is `a`. Each bucket is actually a queue. They are all computed in
// parallel. Each queue waits for the outgoing URL to be totally consumed by the
// test queue (see bellow) before sending another one.
var urlQueues = {};

function error404(queueItem) {
    process.stderr.write(queueItem.url + ' responds with a 404.\n');
}

function error(queueItem) {
    process.stderr.write(
        queueItem.url + ' failed to fetch ' +
        '(status code: ' + queueItem.stateData.code + ')' +
        '.\n'
    );
}

function enqueueUrl(queueItem) {
    var url       = queueItem.url;
    var parsedUrl = parseURL(url);

    // Compute the URL bucket name.
    var urlQueueName = (parsedUrl.pathname.split('/', 2)[1] || '__root__');

    var logPrefix = '[' + urlQueueName + '] Fetched: ' + url;

    // Filter by content-type.
    if (!queueItem.stateData.contentType ||
        null === queueItem.stateData.contentType.match(/^text\/html/)) {
        console.log(logPrefix + '; skipped, not text/html.');

        return;
    }

    // Filter by URL.
    if (null !== filterByUrls && false === filterByUrls.test(url)) {
        console.log(logPrefix + '; filtered.');

        return;
    }

    // Exclude by URL.
    if (null !== excludeByUrls && true === excludeByUrls.test(url)) {
        console.log(logPrefix + '; excluded.');

        return;
    }

    // The maximum number of URL is reached. Stop the crawler, but its
    // queue is not emptied.
    if (--maximumUrls < 0) {
        crawler.stop();
        console.log(logPrefix + '; ignored, maximum URLs reached.');

        return;
    }

    console.log(logPrefix + '.');

    // Create the URL “bucket”.
    if (undefined === urlQueues[urlQueueName]) {
        urlQueues[urlQueueName] = async.queue(
            function (task, onTaskComplete) {
                console.log(chalk.magenta('[' + task.queueName + '] Waiting to run: ' + task.url) + '.');
                // We pass the onTaskComplete callback to the task on the test queue so it gets called back
                // when the test is finished. This way we only push the next URL once this one has been
                // processed.
                testQueue.push({
                    url          : task.url,
                    queueName    : task.queueName,
                    onUrlComplete: onTaskComplete
                });
            }
        );
    }

    console.log(chalk.yellow('[' + urlQueueName + '] Enqueue: ' + url));

    // Feed the URL “bucket” with a new URL.
    urlQueues[urlQueueName].push({
        queueName: urlQueueName,
        url      : url
    });
}

crawler.on('fetch404', error404)
       .on('fetcherror', error)
       .on('fetchcomplete', enqueueUrl);


// Parse a URL, canonize them and set default values.
var parseURL = function (url) {
    var parsed = URL.parse(url);

    if (!parsed.protocol) {
        parsed.protocol = 'http';
    } else {
        // Remove the trailing colon in the protocol.
        parsed.protocol = parsed.protocol.replace(':', '');
    }

    if (!parsed.port) {
        parsed.port = 'http' === parsed.protocol ? 80 : 443;
    }

    return parsed;
};

// Helper to add a URL to the crawler queue.
var firstUrl = true;
var addURL = function (url) {
    var url = crawler.processURL(url);

    if (!url.host) {
        process.stderr.write('URL ' + value + ' is invalid. Ignore it.\n');

        return;
    }

    if (true === firstUrl) {
        firstUrl                = false;
        crawler.host            = url.host;
        crawler.initialProtocol = url.protocol;
        crawler.initialPort     = url.port;
        crawler.initialPath     = url.path;
    }

    crawler.queue.add(
        url.protocol,
        url.host,
        url.port,
        url.path
    );
};

function start(program, queue) {
    crawler.maxDepth = +program.maximumDepth;

    maximumUrls = +program.maximumUrls;
    testQueue = queue;

    if (true === program.httpTlsDisable) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        crawler.ignoreInvalidSSL                 = true;
    }

    if (undefined !== program.filterByUrls) {
        filterByUrls = new RegExp(program.filterByUrls, 'i');
    }

    if (undefined !== program.excludeByUrls) {
        excludeByUrls = new RegExp(program.excludeByUrls, 'i');
    }

    crawler.start()
}

function stop() {
    console.log('JUST FUCKING STOP');
    Object.keys(urlQueues).forEach(
        function (key) {
            urlQueues[key].kill();
        }
    );

    crawler.stop();
}

module.exports = {
    start: start,
    stop: stop,
    add: addURL
};
