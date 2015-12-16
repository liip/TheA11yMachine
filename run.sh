#!/bin/bash

set -x

function index {
    local url=$1
    local hash=`php -r 'echo sha1($argv[1]);' "$url"`

    touch output/${hash}.html
    echo "<li><a href=\"${hash}.html\">$url</a></li>" >> output/index.html

    echo $1
}

rm -rf output
mkdir -p output
export -f index

./crawl.sh $1 | \
    xargs -n 1 -P 1 -I {} bash -c 'index "$@"' _ {} | \
    ./pa11y.sh -0 -r html -o 'output/%HASH%.html'
