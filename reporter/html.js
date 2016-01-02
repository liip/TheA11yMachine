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
    indexStream = fs.createWriteStream(outputDirectory + '/index.html');
}

function reportError(message) {
    //console.error(message);
}

function reportResults(results, url) {
    var hash = crypto.createHash('sha1').update(url).digest('hex');
    fs.writeFileSync(
        outputDirectory + '/' + hash + '.html',
        buildHtml(results, url),
        {
            flag: 'w',
            mode: 0o644,
            encoding: 'utf8'
        }
    );
    indexStream.write(
        '<li><a href="./' + hash + '.html">' + url + '</a></li>',
        {
            flag: 'a',
            mode: 0o644,
            defaultEncoding: 'utf8',
        }
    );
}

function buildHtml(results, url) {
    var renderMain = template(__dirname + '/templates/report.html');
    var errorCount = results.filter(isError).length;
    var warningCount = results.filter(isWarning).length;
    var noticeCount = results.filter(isNotice).length;
    var total = errorCount + warningCount + noticeCount;

    return renderMain({
        date             : new Date(),
        errorCount       : errorCount,
        errorPercentage  : (errorCount * 100) / total,
        warningCount     : warningCount,
        warningPercentage: (warningCount * 100) / total,
        noticeCount      : noticeCount,
        noticePercentage : (noticeCount * 100) / total,
        results          : buildResultsHtml(results),
        url              : url
    });
}

function buildResultsHtml(results) {
    var renderResult = template(__dirname + '/templates/result.html');

    return results.map(
        function(result) {
            result.typeLabel = upperCaseFirst(result.type);

            return renderResult(result);
        }
    ).join('');
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

        return output.replace(/\s+/g, ' ').trim();
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
