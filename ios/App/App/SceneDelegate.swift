import UIKit
import Capacitor

/// WKWebView with iOS rubber-band bounce.
/// Capacitor sets `scrollView.bounces = false` after creating the view, so we
/// re-enable it in `capacitorDidLoad` (and again on appear).
final class AltmanBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        enableNativeScrollFeel()
        DispatchQueue.main.async { [weak self] in
            self?.enableNativeScrollFeel()
        }
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        enableNativeScrollFeel()
    }

    private func enableNativeScrollFeel() {
        guard let webView else { return }
        let scrollView = webView.scrollView
        scrollView.bounces = true
        scrollView.alwaysBounceVertical = true
        scrollView.alwaysBounceHorizontal = false
        scrollView.decelerationRate = .normal
        scrollView.contentInsetAdjustmentBehavior = .never
        scrollView.keyboardDismissMode = .interactive
        scrollView.showsHorizontalScrollIndicator = false
        // Match --navy so top rubber-band continues the dusk header.
        // Bottom continuation is painted by the CSS body box-shadow canvas band.
        let navy = UIColor(red: 20 / 255, green: 40 / 255, blue: 90 / 255, alpha: 1)
        webView.isOpaque = true
        webView.backgroundColor = navy
        scrollView.backgroundColor = navy
    }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = AltmanBridgeViewController()
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
