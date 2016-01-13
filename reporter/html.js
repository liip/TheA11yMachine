'use strict';

var fs = require('fs');
var mkdirp = require('mkdirp');
var crypto = require('crypto');

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
    indexStream.write(
        buildHtml(
            __dirname + '/templates/index.html',
            {
                date: new Date()
            }
        )
    );
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
                result.noteCodes     = result.code.split('.')[4].split(',');
                result.noteCodeLinks = buildNoteCodesHtml(result.noteCodes);
                result.noteCodeArray = buildNoteCodesArray(result.noteCodes);
            } else {
                result.noteCodes     = [];
                result.noteCodeLinks = '';
                result.noteCodeArray = '[]';
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

        results          : buildResultsHtml(results),
        noteCodeLinks    : buildNoteCodesHtml(noteCodes),
        noteCodeArray    : buildNoteCodesArray(noteCodes)
    };

    fs.writeFileSync(
        outputDirectory + '/' + hash + '.html',
        buildHtml(__dirname + '/templates/report.html', options),
        {
            flag    : 'w',
            encoding: 'utf8'
        }
    );
    indexStream.write(buildHtml(__dirname + '/templates/index-report.html', options));
}

function buildHtml(templateFile, data) {
    var render = template(templateFile);

    return render(data);
}

function buildResultsHtml(results) {
    var renderResult = template(__dirname + '/templates/report-result.html');

    return results.map(renderResult).join('');
}

function buildNoteCodesHtml(noteCodes) {
    return Array.from(noteCodes).map(
        function (noteCode) {
            return '<a href="http://www.w3.org/TR/WCAG20-TECHS/' + noteCode + '.html">' + noteCode + '</a>';
        }
    ).join(', ');
}

function buildNoteCodesArray(noteCodes) {
    return '[' + Array.from(noteCodes).map(
        function (noteCode) {
            return '\'' + noteCode + '\'';
        }
    ).join(', ') + ']';
}

function template(filePath) {
    var content = fs.readFileSync(filePath, 'utf-8');

    return function(context) {
        var output = content;
        Object.keys(context).forEach(
            function(key) {
                output = output.replace(new RegExp('\\{' + key + '\\}', 'g'), escapeHtml(context[key]));
                output = output.replace(new RegExp('\\{' + key + '\\|raw\\}', 'g'), context[key]);
            }
        );

        return output;
    };
}

function upperCaseFirst(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function escapeHtml(html) {
    return String(html)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
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
