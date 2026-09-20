// New explicit registration of the local StoreKit bridge.
import Capacitor
final class FrontlineViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(FrontlineStorePlugin())
    }
}
