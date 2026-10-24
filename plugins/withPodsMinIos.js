/**
 * Xcode 27 refuses to build libraries (pods) that target iOS older than 15.0 (several of ours still say 9.0 to 13.4).
 * This adds a few lines to the generated Podfile that raise every pod below 15.0 up to 15.1 (the app itself targets 15.1).
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARK = 'NIKFOODS_MIN_IOS';
const SNIPPET = `
    # ${MARK}: Xcode 27 refuses pods that target iOS older than 15.0
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        if config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f < 15.0
          config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
        end
      end
    end
`;

module.exports = (config) =>
  withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const file = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      if (!fs.existsSync(file)) return cfg;
      const text = fs.readFileSync(file, 'utf8');
      if (text.includes(MARK)) return cfg;
      const next = text.replace(/post_install do \|installer\|\n/, (m) => m + SNIPPET);
      if (next === text) throw new Error('withPodsMinIos: could not find post_install in the Podfile');
      fs.writeFileSync(file, next);
      return cfg;
    },
  ]);
