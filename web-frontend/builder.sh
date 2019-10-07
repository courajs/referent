set -e

cp -R $src/* .
cp -R $node_modules node_modules

chmod +w public
chmod +w public/sw.js
$sed -i '/const PROD/c\
const PROD = true;
' public/sw.js

$npm run build-prod
mv dist $out;
