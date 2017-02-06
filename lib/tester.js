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

var spawn = require('child_process').spawn;
var pa11y = require('pa11y');

// Running a test includes:
// 1. Using pa11y to run a PhantomJS instance to open a URL, inject sniffers,
//    execute them, read the raw reports and transform them,
// 2. Using The Nu Html Checker, read the raw reports and transform them.
function tester(options) {
    var reporter = null;

    if (!options.reportOptions) {
        options.reportOptions = {};
    }

    options.reportOptions.outputDirectory = options.outputDirectory;

    switch (options.report) {
        case 'html':
            reporter = require('../reporter/html');
            reporter.config(options.reportOptions);

            break;

        case 'cli':
        case 'csv':
        case 'json':
            reporter = require('../node_modules/pa11y/reporter/' + options.report);

            break;

        default:
            reporter = require(options.report);
            reporter.config(options.reportOptions);
    }

    var a11yStandard = null;
    var htmlStandard = false;
    var standards    = options.standards.split(',');
    var _index       = standards.indexOf('HTML');

    if (-1 !== _index) {
        htmlStandard = true;
        standards.splice(_index, 1);
        a11yStandard = standards.join('');
    } else {
        a11yStandard = standards.join('');
    }

    var testerOptions = {
        log             : reporter,
        standard        : a11yStandard,
        allowedStandards: [a11yStandard],
        htmlcs          : options.sniffers,
        page            : {
            headers: {
                'User-Agent': 'liip/a11ym'
            },
            settings: {},
            viewport: {
                width : 1280,
                height: 720
            }
        },
        phantom: {
            parameters: {
                'ignore-ssl-errors': 'true',
                'proxy-type'       : 'none'
            }
        }
    };

    if (options.httpAuthUser) {
        testerOptions.page.settings.userName = options.httpAuthUser;
        testerOptions.page.settings.password = options.httpAuthPassword;
    }

    var errorLevelToInteger = function (errorLevel) {
        switch (errorLevel) {
            case 'notice':
                return 1;

            case 'warning':
                return 2;

            case 'error':
                return 3;

            default:
                return 0;
        }
    };

    var minimumErrorLevel   = errorLevelToInteger(options.errorLevel);
    var filterByErrorLevels = function (errorLevel) {
        return minimumErrorLevel <= errorLevelToInteger(errorLevel);
    };
    var filterByCodes  = function () { return true; };
    var excludeByCodes = function () { return true; };

    if (options.filterByCodes) {
        var filterByCodesRegex = new RegExp('\\b(' + options.filterByCodes.replace(/[\s,]/g, '|') + ')\\b', 'i');

        filterByCodes = function(code) {
            return code && filterByCodesRegex.test(code);
        };
    }

    if (options.excludeByCodes) {
        var excludeByCodesRegex = new RegExp('\\b(' + options.excludeByCodes.replace(/[\s,]/g, '|') + ')\\b', 'i');

        excludeByCodes = function(code) {
            return code && !excludeByCodesRegex.test(code);
        };
    }

    var testHTML = new function () {
        return function (url, onComplete) {
            if (true !== htmlStandard) {
                onComplete(null, []);

                return;
            }

            var results = '';
            var vnu     = spawn(
                'java',
                [
                    '-jar',
                    __dirname + '/../resource/vnu/vnu.jar',
                    '--format',
                    'json',
                    url
                ]
            );
            vnu.stderr.on(
                'data',
                function (data) {
                    results += data;
                }
            );
            vnu.on(
                'exit',
                function () {
                    onComplete(
                        null,
                        JSON
                            .parse(results)
                            .messages
                            .map(
                                function (result) {
                                    return {
                                        type: 'html',
                                        // error, warning, notice
                                        level: result.type.replace('info', 'notice'),
                                        // nothing
                                        code: null,
                                        // HTML piece
                                        context: (result.extract || '').trim(),
                                        // nothing
                                        selector: null,
                                        // message
                                        message: result.message
                                    };
                                }
                            )
                            .filter(
                                function (result) {
                                    return filterByErrorLevels(result.level);
                                }
                            )
                    );
                }
            );
        };
    };
    var testA11y = new function () {
        if (!a11yStandard) {
            return function (url, onComplete) {
                onComplete(null, []);
            };
        }

        return function (url, onComplete) {
            pa11y(testerOptions).run(url, onComplete);
        };
    };

    return function (url, onSuccess, onError) {
        var lateAccumulator = function (counter, callback) {
            var accumulator = [];

            return function (values, logger) {
                accumulator = accumulator.concat(values);

                if (--counter === 0) {
                    var handle = logger(accumulator, url);

                    if (handle instanceof Promise) {
                        handle.then(
                            function () {
                                callback(accumulator);
                            }
                        ).catch(
                            function () {
                                callback(accumulator);
                            }
                        );
                    } else {
                        callback(accumulator);
                    }
                }
            };
        };
        var _onSuccess = lateAccumulator(2, onSuccess);
        var _onError   = lateAccumulator(2, onError);

        try {
            testA11y(
                url,
                function (error, results) {
                    if (error) {
                        return _onError(error, testerOptions.log.error);
                    }

                    results =
                        results
                            .map(
                                function (result) {
                                    return {
                                        type: 'a11y',
                                        // error, warning or notice.
                                        level: result.type,
                                        // e.g. WCAG2AA.PrincipleX.GuidelineX_Y.X_Y_Z.….…
                                        code: result.code,
                                        // e.g. <title>Foobar</title>
                                        context: result.context,
                                        // e.g. 'html > head > title'
                                        selector: result.selector,
                                        // message
                                        message: result.message
                                    };
                                }
                            )
                            .filter(
                                function (result) {
                                    return filterByErrorLevels(result.level) &&
                                        filterByCodes(result.code) &&
                                        excludeByCodes(result.code);
                                }
                            );

                    _onSuccess(results, testerOptions.log.results);
                }
            );

            testHTML(
                url,
                function (error, results) {
                    _onSuccess(results, testerOptions.log.results);
                }
            );
        } catch (error) {
            testerOptions.log.error(error.stack);
            process.exit(1);
        }
    };
};

module.exports = tester;
