'use strict';

var pa11y    = require('pa11y');

// Running a test includes using a PhantomJS instance to open a URL, inject
// sniffers, execute them, read the raw reports and transform them.
module.exports = function(program) {
    var reporter = null;

    if (-1 !== ['cli', 'csv', 'json'].indexOf(program.report)) {
        reporter = require('./node_modules/pa11y/reporter/' + program.report);
    } else {
        reporter = require('./reporter/html');
        reporter.config({
            outputDirectory: program.output
        });
    }

    var options = {
        log      : reporter,
        standard : program.standard,
        standards: [program.standard],
        htmlcs   : program.sniffers
    };

    var filterByCodes  = null;
    var excludeByCodes = null;

    if (undefined !== program.filterByCodes) {
        filterByCodes = new RegExp('\\b(' + program.filterByCodes.replace(/[\s,]/g, '|') + ')\\b', 'i');
    }

    if (undefined !== program.excludeByCodes) {
        excludeByCodes = new RegExp('\\b(' + program.excludeByCodes.replace(/[\s,]/g, '|') + ')\\b', 'i');
    }

    var test = pa11y(options);

    return function (url, onSuccess, onError) {
        try {
            test.run(
                url,
                function (error, results) {
                    if (error) {
                        options.log.error(error.stack);

                        return onError(error);
                    }

                    if (null !== filterByCodes) {
                        results = results.filter(
                            function (result) {
                                return filterByCodes.test(result.code);
                            }
                        );
                    }

                    if (null !== excludeByCodes) {
                        results = results.filter(
                            function (result) {
                                return !excludeByCodes.test(result.code);
                            }
                        );
                    }

                    options.log.results(results, url);

                    if (true === reportShouldFail(program.level, results)) {
                        return onError(error);
                    }

                    onSuccess(results);
                }
            );
        } catch (error) {
            options.log.error(error.stack);
            process.exit(1);
        }
    };
};

// Define when the process should fail or not.
var reportShouldFail = function (level, results) {
    if (level === 'notice') {
        return results.length > 0;
    }

    if (level === 'warning') {
        return results.filter(isErrorOrWarning).length > 0;
    }

    return results.filter(isError).length > 0;
};

// Is the result an error?
var isError = function (result) {
    return 'error' === result.type;
};

// Is the result an error or a warning?
var isErrorOrWarning = function (result) {
    return isError(result) || 'warning' === result.type;
};