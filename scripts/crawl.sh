#!/usr/bin/env node

var Crawler = require('simplecrawler');
var program = require('commander');
var process = require('process');
var URL     = require('url');

program
    .usage('[options] <url>')
    .option(
        '-d, --depth <depth>',
        'Maximum depth (hops)',
        3
    )
    .parse(process.argv);

program.url = program.args[0];

if (!program.url) {
    program.help();
    process.exit(1);
}

var url                 = URL.parse(program.url);
var crawler             = new Crawler(url.hostname);
crawler.initialPath     = url.path;
crawler.initialPort     = url.port || 80;
crawler.initialProtocol = url.protocol || 'http';
crawler.interval        = 100;
crawler.maxConcurrency  = 5;
crawler.maxDepth        = +program.depth;

crawler.on('fetchcomplete', function(queueItem) {

    process.stdout.write(queueItem.url + '\n');
});

crawler.start();
