'use strict';

var _      = require('underscore');
var crypto = require('crypto');
var fs     = require('fs');
var mkdirp = require('mkdirp');

module.exports = {
    config: config,
    begin: emptyFunction,
    error: reportError,
    debug: emptyFunction,
    info: emptyFunction,
    results: reportResults
};

var outputDirectory = null;
var indexStream = null;

function emptyFunction() {}

function config(options) {
    outputDirectory = options.outputDirectory;
    mkdirp(outputDirectory);
    indexStream = fs.createWriteStream(
        outputDirectory + '/index.html',
        {
            flag: 'a',
            defaultEncoding: 'utf8'
        }
    );

    var indexDotHtml = _.template(
        fs.readFileSync(__dirname + '/templates/index.html', {encoding: 'utf-8'})
    );

    indexStream.write(indexDotHtml({date: new Date()}));
}

function reportError(message) {
    //console.error(message);
}

function reportResults(results, url) {
    var hash = crypto.createHash('sha1').update(url).digest('hex');

    var noteCodes    = new Set();
    var errorCount   = 0;
    var warningCount = 0;
    var noticeCount  = 0;

    results.forEach(
        function(result, index) {
            result.typeLabel = upperCaseFirst(result.type);
            result.index     = index;

            if (true === /Principle.+Guideline/.test(result.code)) {
                result.noteCodes = result.code.split('.')[4].split(',');
            } else {
                result.noteCodes = [];
            }

            result.noteCodes.forEach(
                function (value) {
                    noteCodes.add(value);
                }
            );

            if (true === isError(result)) {
                ++errorCount;
            } else if (true === isWarning(result)) {
                ++warningCount;
            } else if (true === isNotice(result)) {
                ++noticeCount;
            }
        }
    );

    var total             = Math.max(errorCount + warningCount + noticeCount, 1);
    var errorPercentage   = (errorCount * 100) / total;
    var warningPercentage = (warningCount * 100) / total;
    var noticePercentage  = (noticeCount * 100) / total;

    var reportDotHtml = _.template(
        fs.readFileSync(__dirname + '/templates/report.html', {encoding: 'utf-8'})
    );
    var reportResultDotHtml = _.template(
        fs.readFileSync(__dirname + '/templates/report-result.html', {encoding: 'utf-8'})
    );
    var indexReportDotHtml = _.template(
        fs.readFileSync(__dirname + '/templates/index-report.html', {encoding: 'utf-8'})
    );

    var options = {
        url              : url,
        reportUrl        : './' + hash + '.html',
        date             : new Date(),

        errorCount       : errorCount,
        errorPercentage  : errorPercentage,
        errorOffset      : 0,
        warningCount     : warningCount,
        warningPercentage: warningPercentage,
        warningOffset    : -errorPercentage,
        noticeCount      : noticeCount,
        noticePercentage : noticePercentage,
        noticeOffset     : -(errorPercentage + warningPercentage),

        results          : results,
        noteCodes        : noteCodes
    };

    fs.writeFileSync(
        outputDirectory + '/' + hash + '.html',
        reportDotHtml(options),
        {
            flag    : 'w',
            encoding: 'utf8'
        }
    );
    indexStream.write(indexReportDotHtml(options));
}

function upperCaseFirst(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function isError(result) {
    return (result.type === 'error');
}

function isNotice(result) {
    return (result.type === 'notice');
}

function isWarning(result) {
    return (result.type === 'warning');
}

// Polyfill from
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/from#Polyfill.
if (!Array.from) {
    Array.from = (function () {
        var toStr = Object.prototype.toString;
        var isCallable = function (fn) {
            return typeof fn === 'function' || toStr.call(fn) === '[object Function]';
        };
        var toInteger = function (value) {
            var number = Number(value);
            if (isNaN(number)) { return 0; }
            if (number === 0 || !isFinite(number)) { return number; }
            return (number > 0 ? 1 : -1) * Math.floor(Math.abs(number));
        };
        var maxSafeInteger = Math.pow(2, 53) - 1;
        var toLength = function (value) {
            var len = toInteger(value);
            return Math.min(Math.max(len, 0), maxSafeInteger);
        };

        // The length property of the from method is 1.
        return function from(arrayLike/*, mapFn, thisArg */) {
            // 1. Let C be the this value.
            var C = this;

            // 2. Let items be ToObject(arrayLike).
            var items = Object(arrayLike);

            // 3. ReturnIfAbrupt(items).
            if (arrayLike == null) {
                throw new TypeError("Array.from requires an array-like object - not null or undefined");
            }

            // 4. If mapfn is undefined, then let mapping be false.
            var mapFn = arguments.length > 1 ? arguments[1] : void undefined;
            var T;
            if (typeof mapFn !== 'undefined') {
                // 5. else
                // 5. a If IsCallable(mapfn) is false, throw a TypeError exception.
                if (!isCallable(mapFn)) {
                    throw new TypeError('Array.from: when provided, the second argument must be a function');
                }

                // 5. b. If thisArg was supplied, let T be thisArg; else let T be undefined.
                if (arguments.length > 2) {
                    T = arguments[2];
                }
            }

            // 10. Let lenValue be Get(items, "length").
            // 11. Let len be ToLength(lenValue).
            var len = toLength(items.length);

            // 13. If IsConstructor(C) is true, then
            // 13. a. Let A be the result of calling the [[Construct]] internal method of C with an argument list containing the single item len.
            // 14. a. Else, Let A be ArrayCreate(len).
            var A = isCallable(C) ? Object(new C(len)) : new Array(len);

            // 16. Let k be 0.
            var k = 0;
            // 17. Repeat, while k < len… (also steps a - h)
            var kValue;
            while (k < len) {
                kValue = items[k];
                if (mapFn) {
                    A[k] = typeof T === 'undefined' ? mapFn(kValue, k) : mapFn.call(T, kValue, k);
                } else {
                    A[k] = kValue;
                }
                k += 1;
            }
            // 18. Let putStatus be Put(A, "length", len, true).
            A.length = len;
            // 20. Return A.
            return A;
        };
    }());
}
