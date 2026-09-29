import UIKit
import Social
import UniformTypeIdentifiers

/**
 * Native iOS Share Extension for ReelRush.
 * Receives shared URLs or plain text from Instagram's iOS Share Sheet,
 * persists the shared payload in the shared App Group (`group.com.reelrush.app`),
 * and immediately deep-links into `reelrush://share?text=<encoded>`.
 */
class ShareViewController: UIViewController {
  private let appGroupId = "group.com.reelrush.app"
  private let urlScheme = "reelrush"

  override func viewDidAppear(_ animated: Bool) {
    super.viewDidAppear(animated)
    handleSharedItems()
  }

  private func handleSharedItems() {
    guard let extensionItem = extensionContext?.inputItems.first as? NSExtensionItem,
          let attachments = extensionItem.attachments else {
      completeRequest()
      return
    }

    let urlType = UTType.url.identifier
    let textType = UTType.plainText.identifier

    for provider in attachments {
      if provider.hasItemConformingToTypeIdentifier(urlType) {
        provider.loadItem(forTypeIdentifier: urlType, options: nil) { [weak self] item, _ in
          if let url = item as? URL {
            self?.openHostApp(with: url.absoluteString)
          } else if let text = item as? String {
            self?.openHostApp(with: text)
          } else {
            self?.completeRequest()
          }
        }
        return
      }

      if provider.hasItemConformingToTypeIdentifier(textType) {
        provider.loadItem(forTypeIdentifier: textType, options: nil) { [weak self] item, _ in
          if let text = item as? String {
            self?.openHostApp(with: text)
          } else if let url = item as? URL {
            self?.openHostApp(with: url.absoluteString)
          } else {
            self?.completeRequest()
          }
        }
        return
      }
    }

    completeRequest()
  }

  private func openHostApp(with sharedText: String) {
    if let userDefaults = UserDefaults(suiteName: appGroupId) {
      userDefaults.set(sharedText, forKey: "ReelRushSharedText")
      userDefaults.synchronize()
    }

    let allowed = CharacterSet.urlQueryAllowed.subtracting(CharacterSet(charactersIn: "&+=?"))
    let encoded = sharedText.addingPercentEncoding(withAllowedCharacters: allowed) ?? ""

    guard let targetUrl = URL(string: "\(urlScheme)://share?text=\(encoded)") else {
      completeRequest()
      return
    }

    DispatchQueue.main.async { [weak self] in
      self?.openURL(targetUrl)
      self?.completeRequest()
    }
  }

  @objc private func openURL(_ url: URL) {
    var responder: UIResponder? = self
    while responder != nil {
      if let application = responder as? UIApplication {
        application.open(url, options: [:], completionHandler: nil)
        return
      }
      responder = responder?.next
    }
  }

  private func completeRequest() {
    DispatchQueue.main.async { [weak self] in
      self?.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
    }
  }
}
