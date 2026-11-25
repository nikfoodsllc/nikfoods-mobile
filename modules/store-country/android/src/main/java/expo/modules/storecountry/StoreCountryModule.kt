package expo.modules.storecountry

import android.content.Context
import android.telephony.TelephonyManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Android has no App Store country to read, so the phone's SIM country stands in for it (then the mobile network's country).
 * Same use as on iPhone: it picks the Platform Fee rate shown in the cart; the server checks the card's country at payment anyway.
 * Returns a 2-letter code ("US") or null when the phone has no SIM or network.
 */
class StoreCountryModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("StoreCountry")

    AsyncFunction("getStoreCountry") {
      val context = appContext.reactContext ?: return@AsyncFunction null
      val phone = context.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager
      val sim = phone?.simCountryIso?.trim().orEmpty()
      val network = phone?.networkCountryIso?.trim().orEmpty()
      val code = when {
        sim.length == 2 -> sim
        network.length == 2 -> network
        else -> ""
      }
      if (code.isEmpty()) null else code.uppercase()
    }
  }
}
