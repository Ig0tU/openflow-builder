//
//  OnlineAppCreator.com
//  WebViewGold for iOS 4.4 (Swift)
//

/************************************************************************************************************************/
//General WebView settings
var host = "clintonprairie.com"                // Domain host without http:// or www. (e.g. "google.com")
var webviewurl = "https://www.clintonprairie.com/app"  //Your URL including http:// and www.
var uselocalhtmlfolder = "false"                     //Set to "true" to use local "local-www/index.html" file instead of URL
var openallexternalurlsinsafaribydefault = "false"   //Set to "true" to open links in Safari, which are not your domain host
var preventoverscroll = "true"  //Set to "true" to stop the WebView bounce animation (recommended for most cases)
var deletechache = "true"  //Set to "true" to delete the chache while starting the app
var okbutton = "OK"  //Text label of the "OK" buttons
var bigiphonexstatusbar = "false" //Set to "true" to enhance iPhone X Status Bar size

//UserAgents
var useragent_iphone = ""  //Customized UserAgent on iPhone (leave it empty to use the default iOS UserAgent)
var useragent_ipad = ""  //Customized UserAgent on iPhone (leave it empty to use the default iOS UserAgent)

//"First run" alert box
var activatefirstrundialog = "false"  //Set to "true" to activate the "First run" alert box
var firstrunmessagetitle = "Welcome!"  //Title label of the "First run" alert box
var firstrunmessage = "Thank you for downloading this app!" //Text label of the "First run" alert box

//Offline screen and dialog
var offlinetitle = "Connection error"  //Title label of the "Offline" alert box
var offlinemsg = "Please check your connection."  //Text of the "Offline" alert box
var screen1 = "Connection down?"  //Text label 1 of the "Offline" screen
var screen2 = "WiFi and mobile data are supported."  //Text label 2 of the "Offline" screen
var buttontext = "Try again"  //Text label of the "Try again" button

//"Rate this app on App Store" dialog
var activateratemyappdialog = "false"  //Set to "true" to activate the "Rate this app on App Store" dialog

//"Follow on Facebook" dialog
var activatefacebookfriendsdialog = "false"  //Set to "true" to activate the "Follow on Facebook" dialog
var becomefacebookfriendstitle = "Stay tuned"  //Title label of the "Follow on Facebook" dialog
var becomefacebookfriendstext = "Become friends with us on Facebook?"  //Text label of the "Follow on Facebook" dialog
var becomefacebookfriendsyes = "Yes"  //Text label of the "Yes" button of the "Follow on Facebook" dialog
var becomefacebookfriendsno = "No"  //Text label of the "No" button of the "Follow on Facebook" dialog
var becomefacebookfriendsurl = "https://www.facebook.com/" //URL of your Facebook fanpage

//Image Downloader API
var imagedownloadedtitle = "Image saved to your photo gallery."  //Title label of the "Image saved to your photo gallery" dialog box
var imagenotfound = "Image not found."  //Title label of the "Image not found" dialog box

//Custom status bar design
let statusbarbackgroundcolor = UIColor(red: CGFloat(0 / 255.0), green: CGFloat(0 / 255.0), blue: CGFloat(255 / 255.0), alpha: CGFloat(1.0))
var usemystatusbarbackgroundcolor = "false"  //Set to "true" to activate the custom status bar background color; use a service like "RGB Color Picker": http://www.colorpicker.com
let statusbarcolor = UIColor(red: CGFloat(225 / 255.0), green: CGFloat(0 / 255.0), blue: CGFloat(0 / 255.0), alpha: CGFloat(1.0))
var usemystatusbarcolor = "false" //Set to "true" to activate the custom status bar text color (inofficial API, see http://stackoverflow.com/questions/23512700/how-to-set-text-color-of-status-bar-other-than-white-and-black); use a service like "RGB Color Picker": http://www.colorpicker.com
/************************************************************************************************************************/


import UIKit
import PDFKit
import AVFoundation
import UserNotifications
import WebKit
import StoreKit
import OneSignal

class WebViewController: UIViewController, OSSubscriptionObserver
{
    @IBOutlet var loadingSign: UIActivityIndicatorView!
    @IBOutlet var offlineImageView: UIImageView!
    @IBOutlet var lblText1: UILabel!
    @IBOutlet var lblText2: UILabel!
    @IBOutlet var btnTry: UIButton!
    @IBOutlet var statusbarView: UIView!
    var webView: WKWebView!
    var pdfvc: UIViewController!
    var navViewController: UINavigationController!
    //var activityVC:UIActivityViewController!
  var objectsToShare:NSURL!
  
    var isFirstTimeLoad = true
    
    override func viewDidLoad()
    {
        super.viewDidLoad()
        isFirstTimeLoad = true
        
        if(Constants.kPushEnabled)
        {
            OneSignal.add(self as OSSubscriptionObserver)
        }
        
        let audioSession = AVAudioSession.sharedInstance()
        
        do {
            try audioSession.setCategory(AVAudioSessionCategoryPlayback)
        }
        catch {
        }
        
        if usemystatusbarcolor.isEqual("true")
        {
            _ = self.setStatusBarColor(statusbarcolor)
        }
        
        if usemystatusbarbackgroundcolor.isEqual("true")
        {
            self.statusbarView.backgroundColor = statusbarbackgroundcolor
        }
        
        switch UIDevice.current.userInterfaceIdiom {
        case .phone:
            if useragent_iphone.isEqual("")
            {
                
            }
            else
            {
                let customuseragent = [
                    "UserAgent" : useragent_iphone
                ]
                
                UserDefaults.standard.register(defaults: customuseragent)
            }
        case .pad:
            if useragent_ipad.isEqual("")
            {
                
            }
            else
            {
                let customuseragent = [
                    "UserAgent" : useragent_ipad
                ]
                
                UserDefaults.standard.register(defaults: customuseragent)
            }
        case .unspecified:
            if useragent_iphone.isEqual("")
            {
                
            }
            else
            {
                let customuseragent = [
                    "UserAgent" : useragent_iphone
                ]
                
                UserDefaults.standard.register(defaults: customuseragent)
            }
        case .tv:
            print("tv");
        case .carPlay:
            print("carplay");
        }
        
        
        UIApplication.shared.statusBarStyle = .default
        
        webView = WKWebView()
        webView.navigationDelegate = self
        webView.uiDelegate = self
        addWebViewToMainView(webView)
        
        
        let phonecheck = UIScreen.main.bounds
        let statusbar: CGFloat = 20
        
        if phonecheck.size.height == 667 - statusbar
        {
            offlineImageView.frame = CGRect(x: CGFloat(103), y: CGFloat(228), width: CGFloat(170), height: CGFloat(170))
            lblText1.frame = CGRect(x: CGFloat(40), y: CGFloat(400), width: CGFloat(295), height: CGFloat(50))
            lblText2.frame = CGRect(x: CGFloat(25), y: CGFloat(435), width: CGFloat(326), height: CGFloat(50))
            btnTry.frame = CGRect(x: CGFloat(110), y: CGFloat(520), width: CGFloat(150), height: CGFloat(20))
        }
        
        if phonecheck.size.height == 736 - statusbar
        {
            offlineImageView.frame = CGRect(x: CGFloat(123), y: CGFloat(205), width: CGFloat(170), height: CGFloat(170))
            lblText1.frame = CGRect(x: CGFloat(60), y: CGFloat(346), width: CGFloat(295), height: CGFloat(50))
            lblText2.frame = CGRect(x: CGFloat(44), y: CGFloat(374), width: CGFloat(326), height: CGFloat(50))
            btnTry.frame = CGRect(x: CGFloat(132), y: CGFloat(453), width: CGFloat(150), height: CGFloat(20))
        }
        
        UIApplication.shared.applicationIconBadgeNumber = 0
        
        let url = URL(string: webviewurl)!
        host = url.host ?? ""
        
        if preventoverscroll.isEqual("true")
        {
            self.webView.scrollView.bounces = false
        }
        
        if deletechache.isEqual("true")
        {
            URLCache.shared.removeAllCachedResponses()
            URLCache.shared.removeAllCachedResponses()
            let config = WKWebViewConfiguration()
            config.websiteDataStore = WKWebsiteDataStore.nonPersistent()
            HTTPCookieStorage.shared.removeCookies(since: Date.distantPast)
            WKWebsiteDataStore.default().fetchDataRecords(ofTypes: WKWebsiteDataStore.allWebsiteDataTypes()) { records in
                records.forEach { record in
                    WKWebsiteDataStore.default().removeData(ofTypes: record.dataTypes, for: [record], completionHandler: {})
                }
            }
            
            let webView = WKWebView(frame: .zero, configuration: config)
        }
        
        view.bringSubview(toFront: loadingSign)
        
        webView.scrollView.bouncesZoom = false
        webView.allowsLinkPreview = false
        webView.autoresizingMask = ([.flexibleHeight, .flexibleWidth])
        
        offlineImageView.isHidden = true
        loadingSign.stopAnimating()
        loadingSign.isHidden = true
        btnTry.setTitle(buttontext, for: .normal)
        btnTry.setTitle(buttontext, for: .selected)
        lblText1.text = screen1
        lblText2.text = screen2
        lblText1.isHidden = true
        lblText2.isHidden = true
        btnTry.isHidden = true
        
        let onlinecheck = url.absoluteString
        
        if uselocalhtmlfolder.isEqual("true")
        {
            let urllocal = URL(fileURLWithPath: Bundle.main.path(forResource: "index", ofType: "html")!)
            webView.load(URLRequest(url: urllocal))
        }
        else
        {
            if onlinecheck.count == 0
            {
                offlineImageView.isHidden = false
                webView.isHidden = true
                lblText1.isHidden = false
                lblText2.isHidden = false
                btnTry.isHidden = false
                loadingSign.isHidden = true
            }
            else
            {
                loadWeb()
            }
        }
        self.perform(#selector(checkForAlertDisplay), with: nil, afterDelay: 0.5)
    }
    
    override func didReceiveMemoryWarning()
    {
        super.didReceiveMemoryWarning()
    }
    
   
    @IBAction func clickToBtnTry(_ sender: Any)
    {
        offlineImageView.isHidden = true
        lblText1.isHidden = true
        lblText2.isHidden = true
        btnTry.isHidden = true
        webView.isHidden = false
        
        loadWeb()
    }
    
    func loadWeb()
    {
        var urlEx = "";

        if(Constants.kPushEnabled)
        {
            let status: OSPermissionSubscriptionState = OneSignal.getPermissionSubscriptionState()
            let userID = status.subscriptionStatus.userId
            
            if(Constants.kPushEnhanceUrl && userID != nil && userID!.count > 0)
            {
                urlEx = String(format: "%@onesignal_push_id=%@", (webviewurl.contains("?") ? "&" : "?"), userID!);
            }
        }

        let url = URL(string: webviewurl + urlEx)!
        
        let request = URLRequest(url: url)
        webView.load(request)
    }

    func onOSSubscriptionChanged(_ stateChanges: OSSubscriptionStateChanges!)
    {
        if Constants.kPushEnabled && !stateChanges.from.subscribed && stateChanges.to.subscribed
        {
            print("Subscribed for OneSignal push notifications!")
        
            if(Constants.kPushReloadOnUserId)
            {
                loadWeb();
            }
        }
        
        print("SubscriptionStateChange: \n\(stateChanges)")
    }
    
}

extension WebViewController
{
    @objc func checkForAlertDisplay()
    {
        let user = UserDefaults.standard
        srandom(UInt32(time(nil)))
        let randnum = arc4random() % 10
        
        if activateratemyappdialog == "true" {
        if !user.bool(forKey: "ratemyapp")
        {
            if randnum == 1
            {
                if #available( iOS 10.3,*){
                    SKStoreReviewController.requestReview()
                    user.set("1", forKey: "ratemyapp")
                    user.synchronize()
                }
            }
        }
        }
        if activatefacebookfriendsdialog == "true" {
        if !user.bool(forKey: "becomefbfriends")
        {
            if randnum == 2
            {
                user.set("1", forKey: "becomefbfriends")
                user.synchronize()
                
                let alertController = UIAlertController(title: becomefacebookfriendstitle, message: becomefacebookfriendstext, preferredStyle: UIAlertControllerStyle.alert)
                
                let yesAction = UIAlertAction(title: becomefacebookfriendsyes, style: UIAlertActionStyle.default, handler: {
                    alert -> Void in
                    
                    let prefeedback = becomefacebookfriendsurl
                    let feedback = URL(string: prefeedback)!
                    self.open(scheme: feedback)
                    
                })
                
                let noAction = UIAlertAction(title: becomefacebookfriendsno, style: UIAlertActionStyle.cancel, handler: {
                    (action : UIAlertAction!) -> Void in
                    
                })
                
                alertController.addAction(yesAction)
                alertController.addAction(noAction)
                
                self.present(alertController, animated: true, completion: nil)
            }
        }
        }
        
        if activatefirstrundialog == "true" {
        if !user.bool(forKey: "firstrun")
        {
            user.set("1", forKey: "firstrun")
            user.synchronize()
            
            let alertController = UIAlertController(title: firstrunmessagetitle, message: firstrunmessage, preferredStyle: UIAlertControllerStyle.alert)
            
            let okAction = UIAlertAction(title: okbutton, style: UIAlertActionStyle.cancel, handler: {
                (action : UIAlertAction!) -> Void in
                
            })
            
            alertController.addAction(okAction)
            
            self.present(alertController, animated: true, completion: nil)
        }
    }
    }
    func setStatusBarColor(_ color: UIColor) -> Bool
    {
        let statusBar = UIApplication.shared.statusBarView
        let setForegroundColor_sel = NSSelectorFromString("setForegroundColor:")
        
        if statusBar!.responds(to: setForegroundColor_sel)
        {
            _ = statusBar?.perform(setForegroundColor_sel, with: color)
            return true
        }
        else
        {
            return false
        }
    }
    
    func downloadImageAndSave(toGallary imageURLString: String)
    {
        DispatchQueue.global().async {
            
            do
            {
                let data = try Data(contentsOf: URL(string: imageURLString)!)
                
                DispatchQueue.global().async {
                    DispatchQueue.global().async {
                        UIImageWriteToSavedPhotosAlbum(UIImage(data: data)!, nil, nil, nil)
                    }
                    
                    self.loadingSign.stopAnimating()
                    self.loadingSign.isHidden = true
                    
                    let alertController = UIAlertController(title: imagedownloadedtitle, message: nil, preferredStyle: UIAlertControllerStyle.alert)
                    
                    let okAction = UIAlertAction(title: okbutton, style: UIAlertActionStyle.cancel, handler: {
                        (action : UIAlertAction!) -> Void in
                        
                    })
                    
                    alertController.addAction(okAction)
                    
                    self.present(alertController, animated: true, completion: nil)
                }
                
            }
            catch
            {
                DispatchQueue.global().async {
                    self.loadingSign.stopAnimating()
                    self.loadingSign.isHidden = true
                    
                    let alertController = UIAlertController(title: imagenotfound, message: nil, preferredStyle: UIAlertControllerStyle.alert)
                    
                    let okAction = UIAlertAction(title: okbutton, style: UIAlertActionStyle.cancel, handler: {
                        (action : UIAlertAction!) -> Void in
                        
                    })
                    
                    alertController.addAction(okAction)
                    
                    self.present(alertController, animated: true, completion: nil)
                }
            }
        }
    }
    
    func load(url: URL, to localUrl: URL, completion: @escaping () -> ()) {
        
        SVProgressHUD.show(withStatus: "Downloading...")
        
        let sessionConfig = URLSessionConfiguration.default
        let session = URLSession(configuration: sessionConfig)
        let request = URLRequest.init(url: url)
        
        let task = session.downloadTask(with: request) { (tempLocalUrl, response, error) in
            if let tempLocalUrl = tempLocalUrl, error == nil {
                
                SVProgressHUD.dismiss()
                if let statusCode = (response as? HTTPURLResponse)?.statusCode {
                    print("Success: \(statusCode)")
                }
                
                do {
                    let lastPath  = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask
                        , true)[0]
                    guard let items = try? FileManager.default.contentsOfDirectory(atPath: lastPath) else { return }
                    
                    for item in items {
                        let completePath = lastPath.appending("/").appending(item)
                        try? FileManager.default.removeItem(atPath: completePath)
                    }
                    try FileManager.default.copyItem(at: tempLocalUrl, to: localUrl)
                    completion()
                    
                } catch (let writeError) {
                    print("Error writing file \(localUrl) : \(writeError)")
                }
                
            } else {
                print("Error: %@", error?.localizedDescription ?? "");
            }
        }
        task.resume()
        
        
    }
    
    private func open(scheme: URL) {
        
        if #available(iOS 10, *) {
            UIApplication.shared.open(scheme, options: [:],
                                      completionHandler: {
                                        (success) in
                                        print("Open \(scheme): \(success)")
            })
        } else {
            let success = UIApplication.shared.openURL(scheme)
            print("Open \(scheme): \(success)")
        }
    }
}

extension WebViewController: WKNavigationDelegate
{
    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!)
    {
        loadingSign.startAnimating()
        loadingSign.isHidden = false
    }
    
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!)
    {
        loadingSign.stopAnimating()
        loadingSign.isHidden = true
        isFirstTimeLoad = false
    }
    
    
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error)
    {
        if((error as NSError).code == NSURLErrorNotConnectedToInternet)
        {
            if(!isFirstTimeLoad)
            {
                let alertController = UIAlertController(title: offlinetitle, message: offlinemsg, preferredStyle: UIAlertControllerStyle.alert)
                
                let okAction = UIAlertAction(title: okbutton, style: UIAlertActionStyle.cancel, handler: {
                    (action : UIAlertAction!) -> Void in
                    
                })
                
                alertController.addAction(okAction)
                
                self.present(alertController, animated: true, completion: nil)
            }
            
            isFirstTimeLoad = false
            webView.isHidden = true
            loadingSign.isHidden = true
            offlineImageView.isHidden = false
            lblText1.isHidden = false
            lblText2.isHidden = false
            btnTry.isHidden = false
        }
    }
    
    func webView(_ webView: WKWebView, decidePolicyFor navigationResponse: WKNavigationResponse, decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
        
        
        let response = navigationResponse.response as? HTTPURLResponse
        guard let responseURL = response?.url else {
            decisionHandler(.allow)
            return
        }
        let cookies = HTTPCookie.cookies(withResponseHeaderFields: response?.allHeaderFields as? [String : String] ?? [String : String](), for: responseURL)
        for cookie: HTTPCookie in cookies {
            HTTPCookieStorage.shared.setCookie(cookie)
        }
        
        decisionHandler(.allow)
    }
  
    @objc func closePDF(sender: UIBarButtonItem) {
    DispatchQueue.main.async {
      //self.navigationController?.popViewController(animated: true)
      //self.navViewController?.popViewController(animated: true)
      self.pdfvc.dismiss(animated: true, completion: nil)
    }
  }
    @objc func sharePDF(sender:UIBarButtonItem) {
    /*
    if UIDevice.current.userInterfaceIdiom == .pad
    {
      self.activityVC.popoverPresentationController?.sourceView = self.pdfvc.view
      let popover = UIPopoverController(contentViewController: activityVC)
      DispatchQueue.main.async {
        popover.present(from:  CGRect(x: self.pdfvc.view.frame.size.width / 2, y: self.pdfvc.view.frame.size.height / 4, width: 0, height: 0), in: self.pdfvc.view, permittedArrowDirections: .any, animated: true)
      }
    }*/
    
    //else
    //{
    //print("OK")
    let activityVC = UIActivityViewController.init(activityItems: [self.objectsToShare], applicationActivities: nil)
    
    //self.navViewController?.popViewController(animated: true)
    //self.navViewController?.pushViewController(activityVC, animated: true)
    
    //self.pdfvc.present(activityVC, animated: true, completion: nil)
    //self.pdfvc?.present(activityVC,animated:true,completion:nil)
    
    //activityVC.popoverPresentationController?.sourceView = self.pdfvc.view
      DispatchQueue.main.async(execute:  {
        //self.present(activityVC, animated: true, completion: nil)
        self.pdfvc.present(activityVC, animated:true)
        //self.present(activityVC, animated:true)
      })
    //}
  }
  /*
  @objc func sharePDF(sender:UIBarButtonItem) {
    print("SharePDF")
    if UIDevice.current.userInterfaceIdiom == .pad
    {
      let popover = UIPopoverController(contentViewController: activityVC)
      DispatchQueue.main.async {
        popover.present(from:  CGRect(x: self.pdfvc.view.frame.size.width / 2, y: self.pdfvc.view.frame.size.height / 4, width: 0, height: 0), in: self.pdfvc.view, permittedArrowDirections: .any, animated: true)
      }
    }
    else
    {
      DispatchQueue.main.async {
        self.present(self.activityVC,animated:true,completion: nil)
      }
    }
  }
 */
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void)
    {
        
        let requestURL = navigationAction.request.url!
        
        if let urlScheme = requestURL.scheme {
            if urlScheme == "mailto" || urlScheme == "tel" || urlScheme == "maps" || urlScheme == "webcal" {
                if UIApplication.shared.canOpenURL(requestURL) {
                    self.open(scheme: requestURL)
                    decisionHandler(.cancel)
                    return
                }
            } else if urlScheme == "notices" {
                self.loadingSign.stopAnimating()
                self.loadingSign.isHidden = true
                let controller = storyboard?.instantiateViewController(withIdentifier: "NotificationViewController") as! NotificationViewController
                self.present(controller, animated: true, completion: nil)
                decisionHandler(.cancel)
                return
            } else if urlScheme == "infocenter" {
                if UIApplication.shared.canOpenURL(requestURL) {//URL(string: urlScheme + "://")!) {
                    self.loadingSign.stopAnimating()
                    self.loadingSign.isHidden = true
                    self.open(scheme: requestURL)
                    decisionHandler(.cancel)
                    return
                }
            } else if urlScheme == "powerschool" {
                if UIApplication.shared.canOpenURL(requestURL) {//URL(string: urlScheme + "://")!) {
                    self.loadingSign.stopAnimating()
                    self.loadingSign.isHidden = true
                    self.open(scheme: requestURL)
                    decisionHandler(.cancel)
                    return
                }
            }
        }
        
        if requestURL.absoluteString.hasPrefix("savethisimage://?url=")
        {
            let imageURL = requestURL.absoluteString.substring(from: requestURL.absoluteString.index(requestURL.absoluteString.startIndex, offsetBy: "savethisimage://?url=".characters.count))
            self.downloadImageAndSave(toGallary: imageURL)
            loadingSign.stopAnimating()
            self.loadingSign.isHidden = true
            
            decisionHandler(.cancel)
            return
        }
        
        if (requestURL.host != nil) && !(host == requestURL.host!) && (navigationAction.navigationType == .linkActivated) && openallexternalurlsinsafaribydefault.isEqual("true")
        {
            self.open(scheme: requestURL)
            loadingSign.stopAnimating()
            self.loadingSign.isHidden = true
            
            decisionHandler(.cancel)
            return
        }
        
        if requestURL.absoluteString.hasPrefix("reset_app://")
        {
            URLCache.shared.removeAllCachedResponses()
            URLCache.shared.removeAllCachedResponses()
            let config = WKWebViewConfiguration()
            config.websiteDataStore = WKWebsiteDataStore.nonPersistent()
            HTTPCookieStorage.shared.removeCookies(since: Date.distantPast)
            WKWebsiteDataStore.default().fetchDataRecords(ofTypes: WKWebsiteDataStore.allWebsiteDataTypes()) { records in
                records.forEach { record in
                    WKWebsiteDataStore.default().removeData(ofTypes: record.dataTypes, for: [record], completionHandler: {})
                }
            }
            
            let webView = WKWebView(frame: .zero, configuration: config)
            let alert = UIAlertController(title: "App reset was successful", message: "Thank you.", preferredStyle: UIAlertControllerStyle.alert)
            
            alert.addAction(UIAlertAction(title: "OK", style: UIAlertActionStyle.default, handler: nil))
            
            self.present(alert, animated: true, completion: nil)
            webView.reload()
            decisionHandler(.cancel)
            return
            
            
            
        }
        
        if ((requestURL.host != nil) && requestURL.host! == "push.send.cancel")
        {
            UIApplication.shared.cancelAllLocalNotifications()
            
            decisionHandler(.cancel)
            return
        }
        
        if ((requestURL.host != nil) && requestURL.host! == "push.send")
        {
            let prerequest = requestURL
            let finished = prerequest.absoluteString
            var requested = finished.components(separatedBy: "=")
            let seconds = requested[1]
            var logindetails = finished.components(separatedBy: "msg!")
            let logindetected = logindetails[1]
            var logindetailsmore = logindetected.components(separatedBy: "&!#")
            let msg0 = logindetailsmore[0]
            let button0 = logindetailsmore[1]
            let msg = msg0.replacingOccurrences(of: "%20", with: " ")
            let button = button0.replacingOccurrences(of: "%20", with: " ")
            let sendafterseconds: Double = Double(seconds)!
            
            if #available(iOS 10.0, *)
            {
                let action = UNNotificationAction(identifier: "buttonAction", title: button, options: [])
                let category = UNNotificationCategory(identifier: "localNotificationTest", actions: [action], intentIdentifiers: [], options: [])
                UNUserNotificationCenter.current().setNotificationCategories([category])
                
                let notificationContent = UNMutableNotificationContent()
                notificationContent.body = msg
                notificationContent.sound = UNNotificationSound.default()
                
                let notificationTrigger = UNTimeIntervalNotificationTrigger(timeInterval: sendafterseconds, repeats: false)
                
                let localNotificationRequest = UNNotificationRequest(identifier: "localNotificationTest", content: notificationContent, trigger: notificationTrigger)
                
                UNUserNotificationCenter.current().add(localNotificationRequest) {(error) in
                    if let error = error {
                        print("We had an error: \(error)")
                    }
                }
            }
            else
            {
                let pushmsg1 = UILocalNotification()
                pushmsg1.fireDate = Date().addingTimeInterval(sendafterseconds)
                pushmsg1.timeZone = NSTimeZone.default
                pushmsg1.alertBody = msg
                pushmsg1.soundName = UILocalNotificationDefaultSoundName
                pushmsg1.alertAction = button
                UIApplication.shared.scheduleLocalNotification(pushmsg1)
            }
            
            decisionHandler(.cancel)
            return
        }
        
        if uselocalhtmlfolder == "true" {
            if (requestURL.scheme! == "http") || (requestURL.scheme! == "https") || (requestURL.scheme! == "mailto") || (requestURL.scheme! == "fb") || (requestURL.scheme! == "twitter") || (requestURL.scheme! == "instagram") && (navigationAction.navigationType == .linkActivated)
            {
                if openallexternalurlsinsafaribydefault == "true" {
                    self.open(scheme: requestURL)
                    
                    decisionHandler(.cancel)
                    return
                }
            }
            else
            {
                decisionHandler(.allow)
                return
            }
        }
        else {
            
          /* EXAMPLE: Open specific URL "http://m.facebook.com" links in Safari START */
          if (requestURL.query?.range(of:"ext=true") != nil) ||
             (requestURL.absoluteString.range(of: "handouts-forms-flyers") != nil)
          {
            loadingSign.stopAnimating()
            self.loadingSign.isHidden = true
            UIApplication.shared.openURL(requestURL)
            decisionHandler(.cancel)
            return
          }
          else if( requestURL.absoluteString.hasSuffix(".pdf") || requestURL.absoluteString.hasSuffix("/file") ) {
            let localURL = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)[0] + "/Download.pdf"
            let strURL = (requestURL.absoluteString as NSString).addingPercentEscapes(using: String.Encoding.utf8.rawValue)
            
            DispatchQueue.main.async {
              guard let url = strURL?.makeURL() else { return }
  
              let pdfView = PDFView(frame: self.view.frame)
              pdfView.backgroundColor = .gray
              pdfView.translatesAutoresizingMaskIntoConstraints = false
              
              self.load(url: url, to: URL.init(fileURLWithPath: localURL), completion: {
                self.navViewController = UINavigationController(nibName: nil, bundle: nil)
                self.pdfvc = UIViewController.init(nibName: nil, bundle: nil)
                self.navViewController.pushViewController(self.pdfvc, animated: true)
                //self.navViewController.addChildViewController(self.pdfvc)

                let pdfDocument = PDFDocument(url: NSURL.init(fileURLWithPath: localURL) as URL)
                pdfView.document = pdfDocument
                pdfView.displayMode = .singlePageContinuous
                pdfView.autoScales = true

                let backButton = UIBarButtonItem(barButtonSystemItem: UIBarButtonSystemItem.stop, target: self, action: #selector(self.closePDF(sender:)))
                let shareButton = UIBarButtonItem(barButtonSystemItem: UIBarButtonSystemItem.action, target: self, action: #selector(self.sharePDF(sender:)))
                
                self.pdfvc.navigationItem.setRightBarButton(backButton, animated: false)
                self.pdfvc.navigationItem.setLeftBarButton(shareButton, animated: false)
                self.pdfvc.view.addSubview(pdfView)
                
                //let objectsToShare =  NSURL.init(fileURLWithPath: localURL)
                self.objectsToShare = NSURL.init(fileURLWithPath: localURL)
                //self.activityVC = UIActivityViewController(activityItems: [objectsToShare], applicationActivities: nil)
                
                //self.activityVC.popoverPresentationController?.sourceView = self.pdfvc.view
                //self.present(self.navViewController,animated:true)
                DispatchQueue.main.async(execute:  {
                    self.show(self.navViewController, sender: self)
                })
              })
            }
       
            decisionHandler(.cancel)
          }
          else{
            decisionHandler(.allow)
          }
      }
    }
}

extension WebViewController{
    
    private func addWebViewToMainView(_ webView: WKWebView)
    {
        view.addSubview(webView)
        webView.translatesAutoresizingMaskIntoConstraints = false
        
        switch UIScreen.main.nativeBounds.height {
        case 2436:
            view.addConstraint(NSLayoutConstraint(item: webView, attribute: .top, relatedBy: .equal, toItem: view, attribute: .top, multiplier: 1, constant: 44))
        default:
          
            
            if bigiphonexstatusbar.isEqual("true")
            {
            view.addConstraint(NSLayoutConstraint(item: webView, attribute: .top, relatedBy: .equal, toItem: view, attribute: .top, multiplier: 1, constant: 30))
            }
            else{
                  view.addConstraint(NSLayoutConstraint(item: webView, attribute: .top, relatedBy: .equal, toItem: view, attribute: .top, multiplier: 1, constant: 20))
            }
        }
        
        view.addConstraint(NSLayoutConstraint(item: webView, attribute: .left, relatedBy: .equal, toItem: view, attribute: .left, multiplier: 1, constant: 0))
        view.addConstraint(NSLayoutConstraint(item: webView, attribute: .bottom, relatedBy: .equal, toItem:view, attribute: .bottom, multiplier: 1, constant: 0))
        view.addConstraint(NSLayoutConstraint(item: webView, attribute: .right, relatedBy: .equal, toItem: view , attribute: .right, multiplier: 1, constant:0))
        view.layoutIfNeeded()
        
    }
}

extension WebViewController: WKUIDelegate{
    
    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        
        let alertController = UIAlertController(title: Constants.kAppDisplayName, message: message, preferredStyle: .alert)
        
        alertController.addAction(UIAlertAction(title: okbutton, style: .default, handler: { (action) in
            completionHandler()
        }))
        
        UIApplication.topViewController()?.present(alertController, animated: true, completion: nil)
    }
    
    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        
        let alertController = UIAlertController(title: Constants.kAppDisplayName, message: message, preferredStyle: .alert)
        
        alertController.addAction(UIAlertAction(title: okbutton, style: .default, handler: { (action) in
            completionHandler(true)
        }))
        
        alertController.addAction(UIAlertAction(title: "Cancel", style: .cancel, handler: { (action) in
            completionHandler(false)
        }))
        
        UIApplication.topViewController()?.present(alertController, animated: true, completion: nil)
    }
    
    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (String?) -> Void) {
        
        let alertController = UIAlertController(title: Constants.kAppDisplayName, message: prompt, preferredStyle: .alert)
        
        alertController.addTextField { (textField) in
            textField.text = defaultText
            textField.placeholder = "Enter here..."
        }
        
        alertController.addAction(UIAlertAction(title: okbutton, style: .default, handler: { (action) in
            if let text = alertController.textFields?.first?.text {
                completionHandler(text)
            } else {
                completionHandler(defaultText)
            }
            
        }))
        
        alertController.addAction(UIAlertAction(title: "Cancel", style: .default, handler: { (action) in
            
            completionHandler(nil)
            
        }))
        
        UIApplication.topViewController()?.present(alertController, animated: true, completion: nil)
    }
    
}
