import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        // Main.storyboard already points at FrontlineViewController. Keep that
        // instance when UIKit created it, and recover with the same subclass
        // if a scene is ever constructed without the storyboard.
        if window == nil {
            let appWindow = UIWindow(windowScene: windowScene)
            appWindow.rootViewController = FrontlineViewController()
            window = appWindow
        } else if !(window?.rootViewController is FrontlineViewController) {
            window?.rootViewController = FrontlineViewController()
        }
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
