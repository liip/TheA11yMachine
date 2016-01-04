# The A11y Machine

The A11y Machine is an automated accessibility testing tool which crawls and
tests all pages of any website.

## Installation

[NPM](http://npmjs.org/) is required. Then, execute the following lines:
```sh
$ npm install -g phantomjs
$ npm install
```

It requires at least NodeJS 4.0.

## Usage

First, see the help:

```sh
$ ./a11ym --help

  Usage: a11ym [options] <url>

  Options:

    -h, --help                         output usage information
    -d, --depth <depth>                Maximum depth (hops).
    -u, --maximum-urls <maximum_urls>  Maximum number of URLs to compute.
    -o, --output <output_directory>    Output directory.
    -r, --report <report>              Report format: `cli`, `csv`, `html` (default), `json` or `markdown`.
    -s, --standard <standard>          Standard to use: `section508`, `wcag2a`, `wcag2aa` (default) or ` wcag2aaa`.
```

Then, the simplest use is `a11ym` with an URL:

```sh
$ ./a11ym http://example.org
```

Then open `a11ym_output/index.html` and browser the result!

### Possible output

The index of the reports:

<img src="http://i.imgur.com/s7vRCi4.png" alt="Index of the report" width="800" />

Report of a specific URL:

<img src="http://i.imgur.com/ehjwAXw.png" alt="Report of a specific URL" width="800" />

## License

BSD-3-Clause.
