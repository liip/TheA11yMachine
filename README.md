# The A11y Machine

The A11y Machine is an automated accessibility testing tool which crawls and
tests all pages of any website. It validates pages against the following
specifications/laws:

  * [W3C Web Content Accessibility Guidelines](http://www.w3.org/TR/WCAG20/)
    (WCAG) 2.0, including A, AA and AAA levels ([understanding levels of
    conformance](http://www.w3.org/TR/UNDERSTANDING-WCAG20/conformance.html#uc-levels-head)),
  * U.S. [Section 508](http://www.section508.gov/) legislation.

## Installation

[NPM](http://npmjs.org/) is required. Then, execute the following lines:

```sh
$ npm install -g phantomjs
$ npm install the-a11y-machine
```

## Usage

First, see the help:

```sh
$ ./a11ym --help

  Usage: a11ym [options] <url>

  Options:

    -h, --help                         output usage information
    -d, --maximum-depth <depth>        Maximum depth (hops).
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

<img src="resource/screenshots/index.png" alt="Index of the report" width="800" />

Report of a specific URL:

<img src="resource/screenshots/report.png" alt="Report of a specific URL" width="800" />

## License

BSD-3-Clause.
