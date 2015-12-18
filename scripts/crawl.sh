#!/usr/bin/env node

var process = require('process');
var Crawler = require('simplecrawler');

var crawler             = new Crawler(process.argv[2]);
crawler.initialPort     = 80;
crawler.initialProtocol = 'http';
crawler.interval        = 100;
crawler.maxConcurrency  = 5;
crawler.maxDepth        = 3;

var i = 0;
crawler.on('fetchcomplete', function(queueItem) {
    if (++i > 4) {
        process.exit(0);
    }

    process.stdout.write(queueItem.url + '\n');
});

crawler.start();
