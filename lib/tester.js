'use strict';

/**
 * Copyright (c) 2016, Ivan Enderlin and Liip
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
function tester(program) {
    var reporter = null;

    if (-1 !== ['cli', 'csv', 'json'].indexOf(program.report)) {
        reporter = require('../node_modules/pa11y/reporter/' + program.report);
    } else {
        reporter = require('../reporter/html');
        reporter.config({
            outputDirectory: program.output
        });
    }

    var a11yStandard = null;
    var htmlStandard = false;
    var standards    = program.standards.split(',');
    var _index       = standards.indexOf('HTML');

    if (-1 !== _index) {
        htmlStandard = true;
        standards.splice(_index, 1);
        a11yStandard = standards.join('');
    } else {
        a11yStandard = standards.join('');
    }

    var options = {
        log             : reporter,
        standard        : a11yStandard,
        allowedStandards: [a11yStandard],
        htmlcs          : program.sniffers,
        page            : {
            headers: {
                'User-Agent': 'liip/a11ym'
            },
            settings: {}
        }
    };

    if (undefined !== program.httpAuthUser) {
        options.page.settings.userName = program.httpAuthUser;
        options.page.settings.password = program.httpAuthPassword;
    }

    var filterByCodes  = function (results) { return results; };
    var excludeByCodes = function (results) { return results; };

    if (undefined !== program.filterByCodes) {
        var filterByCodesRegex = new RegExp('\\b(' + program.filterByCodes.replace(/[\s,]/g, '|') + ')\\b', 'i');

        filterByCodes = function(results) {
            return results.filter(
                function(result) {
                    return result.code && filterByCodesRegex.test(result.code);
                }
            );
        }
    }

    if (undefined !== program.excludeByCodes) {
        var excludeByCodesRegex = new RegExp('\\b(' + program.excludeByCodes.replace(/[\s,]/g, '|') + ')\\b', 'i');

        excludeByCodes = function(results) {
            return results.filter(
                function(result) {
                    return result.code && !excludeByCodesRegex.test(result.code);
                }
            );
        }
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
                                        context: result.extract.trim(),
                                        // nothing
                                        selector: null,
                                        // message
                                        message: result.message
                                    };
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

                return;
            };
        }

        return function (url, onComplete) {
            pa11y(options).run(url, onComplete);
        };
    };

    return function (url, onSuccess, onError) {
        var lateAccumulator = function (counter, callback) {
            var accumulator = [];

            return function (values, logger) {
                accumulator = accumulator.concat(values);

                if (--counter === 0) {
                    logger(accumulator, url);

                    return callback(accumulator);
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
                        return _onError(error, options.log.error);
                    }

                    results = results.map(
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
                    );

                    results = filterByCodes(results);
                    results = excludeByCodes(results);

                    if (true === reportShouldFail(program.level, results)) {
                        return _onError(error, options.log.results);
                    }

                    _onSuccess(results, options.log.results);
                }
            );

            testHTML(
                url,
                function (error, results) {
                    _onSuccess(results, options.log.results);
                }
            );
        } catch (error) {
            options.log.error(error.stack);
            process.exit(1);
        }
    };
};

// Define when the process should fail or not.
function reportShouldFail(level, results) {
    if (level === 'notice') {
        return results.length > 0;
    }

    if (level === 'warning') {
        return results.filter(isErrorOrWarning).length > 0;
    }

    return results.filter(isError).length > 0;
};

// Is the result an error?
function isError(result) {
    return 'error' === result.type;
};

// Is the result a warning?
function isWarning(result) {
    return 'warning' === result.type;
};

// Is the result an error or a warning?
function isErrorOrWarning(result) {
    return isError(result) || isWarning(result);
};

module.exports = tester;
