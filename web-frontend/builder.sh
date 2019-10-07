set -e

cp -R $src/* .
cp -R $node_modules node_modules
$npm run build-prod
mv dist $out;
