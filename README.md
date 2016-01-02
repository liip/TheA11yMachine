# The A11y Machine

The A11y Machine is an automated accessibility testing tool which crawls and
tests all pages of any website.

## Installation

[NPM](http://npmjs.org/) is required. Then, execute the following line:
```sh
$ npm install -g phantomjs
$ npm install
```

## Usage

Use `a11ym` with an URL:

```sh
$ ./a11ym http://example.org
```

Then open `a11ym_output/index.html` and browser the result!

### Possible output

The index of the reports:

<img src="http://i.imgur.com/bebKxQ8.png" alt="Index of the report" width="800" />

Report of a specific URL:

<img src="http://i.imgur.com/Kdgx9KZ.png" alt="Report of a specific URL" width="800" />

## License

BSD-3-Clause.
