# vnu instance

vnu source code is located in https://github.com/validator/validator.

To build the vnu instance with the W3C HTML ruleset, please (i) be
sure you have `JAVA_HOME` correctly set, and (ii) run the `Makefile`:

```sh
make
```

On macOS, `JAVA_HOME` must be set to `/usr/libexec/java_home` per
default. On Linux, it might be `/usr/lib/jvm/java-8-openjdk-amd64` for
instance.

See https://github.com/liip/TheA11yMachine/issues/98 for more details.
