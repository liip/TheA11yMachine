'use strict';

/**
 * Copyright (c), Ivan Enderlin and Liip
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *    may be used to endorse or promote products derived from this software without
 *    specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 *  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
 * ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

var Crawler = require('simplecrawler');
var Logger  = require('./logger');
var URL     = require('url');
var async   = require('async');
var process = require('process');

// Set the logger.
var logger = null;

// History of all URL being crawled or already crawled.
var history = {};

function newCrawler(initialUrl) {
    // Set the crawler.
    var crawler = new Crawler(initialUrl);

    crawler.interval                 = 50;
    crawler.maxConcurrency           = 5;
    crawler.userAgent                = 'liip/a11ym';
    crawler.timeout                  = 10 * 1000;
    crawler.filterByDomain           = true;
    crawler.allowInitialDomainChange = false;
    crawler.scanSubdomains           = true;

    // Register our own `queueURL` so we can have buckets.
    crawler.oldQueueUrl = crawler.queueURL;
    crawler.queueURL    = function(url, queueItem) {
        var parsedUrl    = 'object' === typeof url ? url : parseURL(url);
        var urlQueueName = (parsedUrl.path.split('/', 2)[1] || '__root__');

        var newUrl =
            parsedUrl.protocol + '://' +
            parsedUrl.host +
            (
                !(
                    ('https' === parsedUrl.protocol && 443 === parsedUrl.port) ||
                    ('http'  === parsedUrl.protocol &&  80 === parsedUrl.port)
                )
                ? (parsedUrl.port ? ':' + parsedUrl.port : '')
                : ''
            ) +
            parsedUrl.path;

        if (true === history[newUrl]) {
            return;
        }

        history[newUrl] = true;

        if (true !== crawler.domainValid(parsedUrl.host)) {
            return;
        }

        // Create the URL “bucket”.
        if (undefined === urlQueues[urlQueueName]) {
            urlQueues[urlQueueName] = async.queue(
                function (task, onTaskComplete) {
                    logger.write(
                        logger.colorize.white('Fetching ' + task.url + '.\n')
                    );
                    crawler.oldQueueUrl(task.url, task.queueItem);
                    onFetchCompleteCallbacks[task.url] = onTaskComplete;
                }
            );
        }

        urlQueues[urlQueueName].push({
            url       : newUrl,
            queueItem : queueItem
        });
    };

    crawler
        .on('fetch404', error404)
        .on('fetcherror', error)
        .on('fetchcomplete', fetchComplete)
        .on('fetchredirect', fetchRedirect);

    return crawler;
}

// Set the crawler.
var crawler = null;

// Declare the test queue variable. It will be redefined in `start`.
var testQueue = null;

// Those to will be redefined in `start` if need be.
var filterByUrl  = function () { return false; };
var excludeByUrl = function () { return false; };

// Each URL is dispatched in a specific bucket. So far, a bucket is defined as
// the first part of the pathname. For instance let's consider the `/a/b/c` URL;
// its bucket is `a`. Each bucket is actually a queue. They are all computed in
// parallel. Each queue waits for the outgoing URL to be totally consumed by the
// fetcher (see bellow) before fetching another one.
var urlQueues                = {};
var onFetchCompleteCallbacks = {};

// Skip URL by its content-type.
function skipByContentType(queueItem) {
    return !queueItem.stateData.contentType || null === queueItem.stateData.contentType.match(/^text\/html/);
}

// Call the bucket callback for this URL so that the next URL
// in the bucket is added to the crawler queue.
function didFetch(url) {
    if (undefined !== onFetchCompleteCallbacks[url]) {
        onFetchCompleteCallbacks[url]();
    }
}

function error404(queueItem) {
    process.stderr.write(queueItem.url + ' responds with a 404.\n');
    didFetch(queueItem.url);
}

function error(queueItem) {
    process.stderr.write(
        queueItem.url + ' failed to fetch ' +
        '(status code: ' + queueItem.stateData.code + ')' +
        '.\n'
    );
    didFetch(queueItem.url);
}

// URL is fetched. Send it to the test queue if it passes filters, and then
// fetch another one in the same bucket.
function fetchComplete(queueItem) {
    var log = function (message) {
        logger.write(
            logger.colorize.yellow('Fetch complete for ' + queueItem.url + message + '\n')
        );
    };

    if (false === crawler.running) {
        log('; cancelled, has been stopped.');

        return;
    } else if (true === skipByContentType(queueItem)) {
        log('; skipped, not text/html.');
    } else if (true === filterByUrl(queueItem.url)) {
        log('; filtered.');
    } else if (true === excludeByUrl(queueItem.url)) {
        log('; excluded.');
    } else {
        log('.');
        logger.write(logger.colorize.magenta('Waiting to run ' + queueItem.url + '.\n'));
        testQueue.push(queueItem.url);
    }

    didFetch(queueItem.url);
}

function fetchRedirect(queueItem, redirectQueueItem) {
    logger.write(
        logger.colorize.yellow(
            'Fetch complete for ' + queueItem.url +
            ', and redirect to ' + redirectQueueItem.url + '.\n'
        )
    );
    history[queueItem.url] = true;
    didFetch(queueItem.url);
}

// Parse a URL, canonize them and set default values.
function parseURL(url) {
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

    return {
        protocol: parsed.protocol,
        host    : parsed.hostname,
        port    : parsed.port,
        path    : parsed.path,
        uriPath : parsed.path,
        depth   : 2
    };
}

// Helper to add a URL to the crawler queue.
var addURL = new function () {
    var firstUrl = true;

    return function (_url) {
        var url = parseURL(_url);

        if (!url.host) {
            process.stderr.write('URL ' + _url + ' is invalid. Ignore it.\n');

            return;
        }

        logger.write(
            logger.colorize.white('Initializing with ' + _url + '.\n')
        );

        history[_url] = true;

        if (true === firstUrl) {
            firstUrl = false;
            crawler  = newCrawler(_url);
        } else {
            crawler.queue.add(
                crawler.processURL(_url),
                true,
                function () { }
            );
        }
    }
};

function start(options, queue) {
    if (!crawler) {
        throw "Crawler has not been initialized. Must add URL with `add` before starting the crawler.";
    }

    crawler.maxDepth = +options.maximumDepth;
    testQueue        = queue;

    if (true === options.httpTlsDisable) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        crawler.ignoreInvalidSSL                 = true;
    }

    if (options.httpAuthUser) {
        crawler.needsAuth = true;
        crawler.authUser  = options.httpAuthUser;
        crawler.authPass  = options.httpAuthPassword;
    }

    if (options.filterByUrls) {
        var filterByUrlRegex = new RegExp(options.filterByUrls, 'i');

        filterByUrl = function(url) {
            return false === filterByUrlRegex.test(url);
        };
    }

    if (options.excludeByUrls) {
        var excludeByUrlRegex = new RegExp(options.excludeByUrls, 'i');

        excludeByUrl = function(url) {
            return true === excludeByUrlRegex.test(url);
        };
    }

    crawler.start()
}

function stop() {
    crawler.stop(true);

    Object
        .keys(urlQueues)
        .forEach(
            function (key) {
                urlQueues[key].kill();
            }
        );
}

module.exports = function (options) {
    logger = new Logger(options);

    this.add   = addURL;
    this.start = start.bind(null, options);
    this.stop  = stop;
};
