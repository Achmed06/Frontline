// New StoreKit 2 bridge. Entitlements come exclusively from verified Apple transactions.
import Capacitor
import StoreKit

@objc(FrontlineStorePlugin)
public class FrontlineStorePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "FrontlineStorePlugin"
    public let jsName = "FrontlineStore"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "entitlements", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "catalog", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise)
    ]
    private var productID: String {
        (Bundle.main.object(forInfoDictionaryKey: "FrontlineStoreProductID") as? String)?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    }
    private var storeMode: String {
        ((Bundle.main.object(forInfoDictionaryKey: "FrontlineStoreMode") as? String) ?? "sandbox")
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .lowercased()
    }
    private var productionStoreEnabled: Bool { storeMode == "production" }
    private var observer: Task<Void, Never>?
    private var purchasing = false

    public override func load() {
        observer = Task { [weak self] in
            for await result in Transaction.updates {
                guard let self else { return }
                if case .verified(let transaction) = result, transaction.productID == self.productID {
                    self.notifyListeners("entitlementsChanged", data: ["owned": await self.owned()])
                    await transaction.finish()
                }
            }
        }
    }
    deinit { observer?.cancel() }

    private func owned() async -> Bool {
        for await result in Transaction.currentEntitlements {
            if case .verified(let transaction) = result,
               transaction.productID == productID, transaction.revocationDate == nil {
                return true
            }
        }
        return false
    }
    private func testEnvironment() async -> Bool {
        do {
            if case .verified(let app) = try await AppTransaction.shared {
                return app.environment == .sandbox || app.environment == .xcode
            }
        } catch { }
        return false
    }
    // Separate cached verified ownership from the network-dependent product catalog.
    @objc func entitlements(_ call: CAPPluginCall) {
        Task { @MainActor in call.resolve(["owned": await owned()]) }
    }
    @objc func catalog(_ call: CAPPluginCall) {
        Task { @MainActor in
            do {
                guard !productID.isEmpty else {
                    call.resolve(["available": false, "price": "", "testOnly": true])
                    return
                }
                let product = try await Product.products(for: [productID]).first
                let environmentAllowed = productionStoreEnabled || await testEnvironment()
                call.resolve([
                    "available": product?.type == .nonConsumable && environmentAllowed,
                    "price": product?.displayPrice ?? "",
                    "testOnly": !productionStoreEnabled
                ])
            } catch { call.reject("Apple-Shop nicht erreichbar. Bitte später erneut versuchen.", "STORE_UNAVAILABLE", error) }
        }
    }
    @objc func purchase(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard !purchasing else { call.reject("Kauf wird bereits bearbeitet."); return }
            purchasing = true
            defer { purchasing = false }
            do {
                guard !productID.isEmpty else {
                    call.reject("StoreKit-Produkt ist für diesen Build nicht konfiguriert."); return
                }
                guard productionStoreEnabled || await testEnvironment() else {
                    call.reject("Dieser Build erlaubt ausschließlich StoreKit-Testkäufe."); return
                }
                if await owned() { call.resolve(["status": "purchased", "owned": true]); return }
                guard let product = try await Product.products(for: [productID]).first, product.type == .nonConsumable else {
                    call.reject(productionStoreEnabled ? "Apple-Produkt ist noch nicht verfügbar." : "Testprodukt noch nicht eingerichtet."); return
                }
                switch try await product.purchase() {
                case .success(let result):
                    guard case .verified(let transaction) = result, transaction.productID == productID else {
                        call.reject("Kauf konnte nicht durch Apple bestätigt werden."); return
                    }
                    let entitlement = await owned()
                    call.resolve(["status": "purchased", "owned": entitlement])
                    notifyListeners("entitlementsChanged", data: ["owned": entitlement])
                    await transaction.finish()
                case .pending: call.resolve(["status": "pending", "owned": await owned()])
                case .userCancelled: call.resolve(["status": "cancelled", "owned": await owned()])
                @unknown default: call.reject("Unbekannter Kaufstatus. Bitte Käufe wiederherstellen.")
                }
            } catch { call.reject("Kauf fehlgeschlagen. Es wurde nichts freigeschaltet.", "PURCHASE_FAILED", error) }
        }
    }
    @objc func restore(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard !purchasing else { call.reject("Eine Apple-Anfrage wird bereits bearbeitet."); return }
            purchasing = true
            defer { purchasing = false }
            do {
                try await AppStore.sync()
                let entitlement = await owned()
                call.resolve(["owned": entitlement])
                notifyListeners("entitlementsChanged", data: ["owned": entitlement])
            } catch { call.reject("Wiederherstellung fehlgeschlagen. Bitte erneut versuchen.", "RESTORE_FAILED", error) }
        }
    }
}
