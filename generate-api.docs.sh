typedoc --plugin typedoc-plugin-markdown --excludeNotExported  --hideGenerator  --excludePrivate   --readme none  --out apidocs src
concat-md --toc --decrease-title-levels --dir-name-as-title apidocs>API.md
rm -rf apidocs