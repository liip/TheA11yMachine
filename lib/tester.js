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

var pa11y = require('pa11y');

// Running a test includes using a PhantomJS instance to open a URL, inject
// sniffers, execute them, read the raw reports and transform them.
module.exports = function(program) {
    var reporter = null;

    if (-1 !== ['cli', 'csv', 'json'].indexOf(program.report)) {
        reporter = require('../node_modules/pa11y/reporter/' + program.report);
    } else {
        reporter = require('../reporter/html');
        reporter.config({
            outputDirectory: program.output
        });
    }

    var options = {
        log      : reporter,
        standard : program.standard,
        standards: [program.standard],
        htmlcs   : program.sniffers,
        page     : {
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
                    return filterByCodesRegex.test(result.code);
                }
            );
        }
    }

    if (undefined !== program.excludeByCodes) {
        var excludeByCodesRegex = new RegExp('\\b(' + program.excludeByCodes.replace(/[\s,]/g, '|') + ')\\b', 'i');

        excludeByCodes = function(results) {
            return results.filter(
                function(result) {
                    return !excludeByCodesRegex.test(result.code);
                }
            );
        }
    }

    var test = pa11y(options);

    return function (url, onSuccess, onError) {
        try {
            test.run(url, function (error, results) {
                if (error) {
                    options.log.error(error.stack);

                    return onError(error);
                }

                results = filterByCodes(results);
                results = excludeByCodes(results);

                options.log.results(results, url);

                if (true === reportShouldFail(program.level, results)) {
                    return onError(error);
                }

                onSuccess(results);
            });
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
