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

            if (true === /^WCAG/.test(result.code)) {
                result.noteCodes     = result.code.split('.')[4].split(',');
                result.noteCodeLinks = buildNoteCodesHtml(result.noteCodes);
            } else {
                result.noteCodes     = [];
                result.noteCodeLinks = '';
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

    var total = errorCount + warningCount + noticeCount;

    fs.writeFileSync(
        outputDirectory + '/' + hash + '.html',
        buildHtml(
            __dirname + '/templates/report.html',
            {
                url              : url,
                date             : new Date(),
                errorCount       : errorCount,
                errorPercentage  : (errorCount * 100) / total,
                warningCount     : warningCount,
                warningPercentage: (warningCount * 100) / total,
                noticeCount      : noticeCount,
                noticePercentage : (noticeCount * 100) / total,
                results          : buildResultsHtml(results)
            }
            ),
        {
            flag: 'w',
            encoding: 'utf8'
        }
    );
    indexStream.write(
        buildHtml(
            __dirname + '/templates/index-report.html',
            {
                url              : url,
                reportUrl        : './' + hash + '.html',
                errorCount       : errorCount,
                errorPercentage  : (errorCount * 100) / total,
                warningCount     : warningCount,
                warningPercentage: (warningCount * 100) / total,
                noticeCount      : noticeCount,
                noticePercentage : (noticeCount * 100) / total,
                noteCodeLinks    : buildNoteCodesHtml(noteCodes)
            }
        )
    );
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
