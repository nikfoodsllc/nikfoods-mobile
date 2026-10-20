// iOS 27 closes any app built with the iOS 27 SDK that does not use the UIScene lifecycle ("NoSceneLifecycleAdoption"
// trap right after launch). Expo SDK 54's generated AppDelegate still creates its window itself, so this plugin:
//  1. declares a scene in Info.plist,
//  2. stops AppDelegate from creating the window and hands React Native a window in SceneDelegate instead.
// Every replacement is checked, so a template change fails the build loudly instead of shipping a crashing app.
const { withAppDelegate, withInfoPlist } = require('@expo/config-plugins');

function replaceOnce(source, search, replacement, label) {
  if (!source.includes(search)) throw new Error(`withSceneLifecycle: could not find ${label} in AppDelegate.swift`);
  return source.replace(search, replacement);
}

const WINDOW_BLOCK = `#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif
`;

const SCENE_CONFIG = `  // Scene lifecycle (required by iOS 27): the window is created in SceneDelegate
  @objc public func application(
    _ application: UIApplication,
    configurationForConnecting connectingSceneSession: UISceneSession,
    options: UIScene.ConnectionOptions
  ) -> UISceneConfiguration {
    let configuration = UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
    configuration.delegateClass = SceneDelegate.self
    return configuration
  }

  // Linking API
`;

const SCENE_DELEGATE = `
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate,
          let factory = appDelegate.reactNativeFactory else { return }

    let window = UIWindow(windowScene: windowScene)
    appDelegate.window = window
    self.window = window

    var launchOptions: [UIApplication.LaunchOptionsKey: Any] = [:]
    if let url = connectionOptions.urlContexts.first?.url { launchOptions[.url] = url }
    factory.startReactNative(withModuleName: "main", in: window, launchOptions: launchOptions)
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    for context in URLContexts {
      _ = RCTLinkingManager.application(UIApplication.shared, open: context.url, options: [:])
    }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    _ = RCTLinkingManager.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
  }
}
`;

module.exports = function withSceneLifecycle(config) {
  config = withInfoPlist(config, (c) => {
    c.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          { UISceneConfigurationName: 'Default Configuration', UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate' },
        ],
      },
    };
    return c;
  });

  return withAppDelegate(config, (c) => {
    if (c.modResults.language !== 'swift') throw new Error('withSceneLifecycle: expected a Swift AppDelegate');
    let src = c.modResults.contents;
    if (src.includes('class SceneDelegate')) return c;
    src = replaceOnce(src, WINDOW_BLOCK, '', 'the window creation block');
    src = replaceOnce(src, '  // Linking API\n', SCENE_CONFIG, 'the "// Linking API" marker');
    src += SCENE_DELEGATE;
    c.modResults.contents = src;
    return c;
  });
};
