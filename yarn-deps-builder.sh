cp $packageJSON ./package.json
cp $yarnLock ./yarn.lock
chmod 666 yarn.lock
yarn install

mv node_modules $out
