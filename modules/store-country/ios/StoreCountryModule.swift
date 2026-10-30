import ExpoModulesCore
import StoreKit

/// The country of the customer's App Store (Apple's 3-letter code, for example "USA" or "IND"), or nil when it cannot be read.
public class StoreCountryModule: Module {
  public func definition() -> ModuleDefinition {
    Name("StoreCountry")

    AsyncFunction("getStoreCountry") { () async -> String? in
      if #available(iOS 15.0, *) {
        return await Storefront.current?.countryCode
      }
      return nil
    }
  }
}
