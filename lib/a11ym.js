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

var Logger   = require('./logger');
var Tester   = require('./tester');
var async    = require('async');
var fs       = require('fs');
var merge    = require('merge');
var process  = require('process');
var readline = require('readline');
var yaml     = require('js-yaml');

// All options.
var defaultOptions = {
    bootstrap       : './a11ym.yml',
    errorLevel      : 'notice',
    filterByCodes   : undefined,
    excludeByCodes  : undefined,
    maximumDepth    : 3,
    maximumUrls     : 128,
    outputDirectory : './a11ym_output',
    report          : 'html',
    reportOptions   : {},
    standards       : 'WCAG2AA',
    sniffers        : __dirname + '/../resource/sniffers.js',
    filterByUrls    : undefined,
    excludeByUrls   : undefined,
    workers         : 4,
    httpAuthUser    : undefined,
    httpAuthPassword: undefined,
    httpTlsDisable  : undefined,
    verbose         : true
};

// Set the logger.
var logger = new Logger();

// Maximum number of URL to compute.
var maximumUrls = 0;

// When an error occurs, update this flag. It will change the exit code of the
// process.
var hasErrors = false;

// The test queue.
// Queue of URL waiting to be tested. This queue has a user-defined concurrency
// level. When a test is executed, it calls the “complete” callback on the
// task. When the maximum number of URL is reached, then we kill this queue.
var testQueue = null;

// When the test queue has been stopped once, update this flag. It avoids to do
// the “stop computation” more than once.
var isStopped = false;

// The crawler instance.
var crawler = undefined;

// Force to quit the program. If errors, exit with a non 0 exit code.
function quit() {
    if (true === hasErrors) {
        logger.write(loggers.colorize.red('Quiting with errors…'));
        process.exit(2);
    } else {
        logger.write(logger.colorize.green('Quitting with success…'));
        process.exit(0);
    }
}

// Kill the test queue and stop the crawler.
function killQueue(reason) {
    if (false !== isStopped) {
        return;
    }

    isStopped = true;
    logger.write(logger.colorize.white.bgRed('Test queue is stopping. ' + reason) + '\n');

    if(undefined !== crawler) {
        crawler.stop();
    }

    testQueue.kill();
    logger.write(logger.colorize.white.bgRed(testQueue.running() + ' tests are still running, waiting…') + '\n');
}

// The tester instance.
var tester = null;

process.on(
    'SIGINT',
    new function () {
        var firstSignal = true;

        return function () {
            killQueue('SIGINT');

            if (false === firstSignal) {
                logger.write(logger.colorize.white.bgRed('OK OK, I do it!') + '\n');

                process.exit(255);
            }

            firstSignal = false;
        }
    }
);

module.exports = {
    defaultOptions: defaultOptions,
    start         : function (options, inputs) {
        inputs = inputs || [];

        if (options.reportOptions &&
            typeof options.reportOptions === 'string') {
            options.reportOptions = JSON.parse(options.reportOptions);

            if (typeof options.reportOptions !== 'object') {
                throw "Report options must be a JSON formatted object. Got:" + options.reportOptions + ".";
            }
        }

        var optionsFromConfigurationFile = {};
        var configurationFile            = options.bootstrap;
        var defaultConfigurationFileUsed = false;

        if (undefined === configurationFile) {
            configurationFile            = defaultOptions.bootstrap;
            defaultConfigurationFileUsed = true;
        }

        if (false === defaultConfigurationFileUsed ||
            true  === fs.existsSync(configurationFile)) {
            try {
                optionsFromConfigurationFile = yaml.safeLoad(
                    fs.readFileSync(
                        configurationFile,
                        'utf8'
                    )
                );
            } catch (e) {
                var _logger = new Logger({verbose: true});
                _logger.write(
                    _logger.colorize.white.bgRed('Error while reading the bootstrap file ' + configurationFile + '.') + '\n'
                );
                console.log(e.message);

                process.exit(1);
            }

            var urls = optionsFromConfigurationFile.urls;

            if (undefined !== urls) {
                if ('string' === typeof urls) {
                    urls = [urls];
                }

                if (0 === inputs.length) {
                    inputs = urls;
                }
            }
        }

        var stagedOptions = merge(defaultOptions, optionsFromConfigurationFile);

        Object.keys(options).forEach(function (key) {
            if (undefined !== options[key]) {
                stagedOptions[key] = options[key];
            }
        });

        options = stagedOptions;

        logger      = new Logger(options);
        tester      = Tester(options);
        maximumUrls = +options.maximumUrls;

        testQueue = async.queue(
            function (url, onTaskComplete) {
                if (--maximumUrls < 0) {
                    onTaskComplete();
                    killQueue('Maximum URLs reached.');

                    return;
                }

                var _wrap = function (callback) {
                    return function () {
                        callback();

                        if (0 === testQueue.running()) {
                            quit();
                        }
                    };
                };

                logger.write(
                    logger.colorize.black.bgGreen(' ' + (options.maximumUrls - maximumUrls) + '/' + options.maximumUrls + ' ') +
                    ' ' +
                    logger.colorize.black.bgGreen('Run: ' + url + '.') +
                    '\n'
                );
                tester(
                    url,
                    _wrap(
                        function (results) {
                            onTaskComplete(null, results);
                        }
                    ),
                    _wrap(
                        function (error) {
                            hasErrors = true;
                            onTaskComplete(error);
                        }
                    )
                );
            },
            +options.workers
        );

        if (0 === inputs.length) {
            return false;
        } else if ((1 === inputs.length && '-' === inputs[0]) || 1 < inputs.length) {
            maximumUrls = 0;

            var add = function (url) {
                options.maximumUrls = ++maximumUrls;
                testQueue.push(url);
            };

            if('-' === inputs[0]) {
                readline
                    .createInterface(process.stdin, undefined)
                    .on('line', add);
            } else {
                inputs.forEach(add);
                options.maximumUrls = maximumUrls;
            }
        } else if (1 === maximumUrls) {
            testQueue.push(inputs[0]);
        } else {
            var Crawler = require('./crawler');
            crawler     = new Crawler(options);

            crawler.add(inputs[0]);
            crawler.start(testQueue);
        }
    }
};
