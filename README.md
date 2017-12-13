<p align="center">
  <a href="https://liip.ch/"><img src="https://github.com/liip.png" alt="Liip" width="150px" /></a><br />
  <em>presents</em><br />
  The Accessibility Testing Machine modified by BenchPrep
</p>

<hr />

# The A11y Machine

[![Version](https://img.shields.io/npm/v/the-a11y-machine.svg)](https://github.com/liip/TheA11yMachine)
[![Downloads](https://img.shields.io/npm/dt/the-a11y-machine.svg)](https://www.npmjs.com/package/the-a11y-machine)
[![License](https://img.shields.io/npm/l/the-a11y-machine.svg)](#authors-and-license)

**The A11y Machine** (or `a11ym` for short, spelled “alym”) is an **automated
accessibility testing tool** which **crawls** and **tests** pages of any Web
application to produce detailed reports. It validates pages against the
following specifications/laws:

  * [W3C Web Content Accessibility Guidelines](http://www.w3.org/TR/WCAG20/)
    (WCAG) 2.0, including A, AA and AAA levels ([understanding levels of
    conformance](http://www.w3.org/TR/UNDERSTANDING-WCAG20/conformance.html#uc-levels-head)),
  * U.S. [Section 508](http://www.section508.gov/) legislation,
  * [W3C HTML5 Recommendation](https://www.w3.org/TR/html/).

## Table of contents

* [Installation](#installation)
* [Usage](#usage)
  * [Output Example](#output-example)
  * [How does it work?](#how-does-it-work)
* [Authors and license](#authors-and-license)


## Installation

[NPM](http://npmjs.org/) is required. Then, execute the following lines:

```sh
$ npm install -g the-a11y-machine
```

You need to [install Java](https://www.java.com/en/download/).


## Usage

```sh
./a11ym --user-id [user_id] --user-auth-token [auth_token] --login-url https://act.staging.benchprep.com/api/v2/sessions/companion-auth --verbose true
```

###  Output Example

The index of the reports:

![Index of the report](resource/screenshots/index.png)

Report of a specific URL:

![Report of a specific URL](resource/screenshots/report.png)

The dashboard of all reports:

![Dashboard of all reports](resource/screenshots/dashboard.jpg)


### How does it work?

The pipe looks like this:

  1. The [`node-simplecrawler`](https://github.com/cgiffard/node-simplecrawler/)
     tool is used to crawl a Web application based on the given URLs, with **our
     own specific exploration algorithm** to provide better results quickly, in
     addition to support **parallelism**,
  2. For each URL found, 2 kind of tests are applied:
      1. **Accessibility**: [PhantomJS](http://phantomjs.org/) runs and
         [`HTML_CodeSniffer`](https://github.com/squizlabs/HTML_CodeSniffer) is
         injected in order to check the page conformance; This step is
         semi-automated by the help of
         [`pa11y`](https://github.com/nature/pa11y), which is a very thin layer
         of code wrapping PhantomJS and `HTML_CodeSniffer`,
      2. **HTML**: [The Nu Html Checker](http://validator.github.io/validator/)
         (v.Nu) is run on the same URL.
  3. Finally, results from different tools are normalized, and enhanced and easy
     to use reports are produced.

PhantomJS and `HTML_CodeSniffer` are widely-used, tested and precise tools.
`pa11y` simplifies the use of these two latters. The Nu Html Checker is the tool
used by the W3C to validate documents online. However, in this case, we **do all
validations offline**! Nothing is sent over the network. Again, privacy.

## Authors and license

Original author is [Ivan Enderlin](http://mnt.io/), accompagnied by [Gilles
Crettenand](https://github.com/krtek4) and [David
Jeanmonod](https://github.com/jeanmonod). This software is backed by
[Liip](https://liip.ch/).
Modifications were done by Chris Jackson for BenchPrep specific needs

[BSD-3-Clause](http://opensource.org/licenses/BSD-3-Clause):

> Copyright (c), Ivan Enderlin and Liip
> All rights reserved.
>
> Redistribution and use in source and binary forms, with or without modification,
> are permitted provided that the following conditions are met:
>
> 1. Redistributions of source code must retain the above copyright notice, this
>    list of conditions and the following disclaimer.
>
> 2. Redistributions in binary form must reproduce the above copyright notice,
>    this list of conditions and the following disclaimer in the documentation
>    and/or other materials provided with the distribution.
>
> 3. Neither the name of the copyright holder nor the names of its contributors
>    may be used to endorse or promote products derived from this software without
>    specific prior written permission.
>
> THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
> ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
> WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
> DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
> ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
> (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
>  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
> ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
> (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
> SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
