//
//  OnlineAppCreator.com
//  WebViewGold for iOS 4.4 (Swift)
//

import UIKit
import UserNotifications
import OneSignal

var registerlocalpush = "true"  //set to "true" to ask user for push notication permission in general

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    
    var window: UIWindow?
    
    
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplicationLaunchOptionsKey: Any]?) -> Bool {

        /*let notificationReceivedBlock: OSHandleNotificationReceivedBlock = { notification in
            
            print("Received Notification: \(notification!.payload.notificationID)")
            DispatchQueue.main.async(execute: {
                self.alertAction(title: "notificationReceivedBlock", message: notification!.payload.body!)
            })
        }
        
        let notificationOpenedBlock: OSHandleNotificationActionBlock = { result in
            // This block gets called when the user reacts to a notification received
            let payload: OSNotificationPayload = result!.notification.payload
            
            var fullMessage = payload.body
            print("Message = \(fullMessage)")
            
            if payload.additionalData != nil {
                if payload.title != nil {
                    let messageTitle = payload.title
                    print("Message Title = \(messageTitle!)")
                }
                
                let additionalData = payload.additionalData
                if additionalData?["actionSelected"] != nil {
                    fullMessage = fullMessage! + "\nPressed ButtonID: \(additionalData!["actionSelected"])"
                }
            }
            
            DispatchQueue.main.async(execute: {
                self.alertAction(title: "notificationOpenedBlock", message: fullMessage!)
            })
        }*/
        
        //let defaults = UserDefaults.standard
        //defaults.removeObject(forKey: "notifications")
        
        if #available(iOS 10.0, *) {
            let center = UNUserNotificationCenter.current()
            center.delegate = self
            let authOptions: UNAuthorizationOptions = [.alert, .badge, .sound]
            UNUserNotificationCenter.current().requestAuthorization(options: authOptions, completionHandler: {_, _ in })
        }
        
        let remoteNotif = launchOptions?[UIApplicationLaunchOptionsKey.remoteNotification] as? [String: Any]
        if remoteNotif != nil {
            let aps = remoteNotif!["aps"] as? [String:AnyObject]
            self.alertAction(title: "launchOptions", message: String(describing: aps))
        }


        if Constants.kPushEnabled
        {
            let onesignalInitSettings = [kOSSettingsKeyAutoPrompt: true]
            
  
            OneSignal.initWithLaunchOptions(launchOptions,
                                            appId: "963844ea-5237-41b1-ba10-2d743dc81b57", //OneSignal APP ID
                                            handleNotificationAction: nil,
                                            settings: onesignalInitSettings)
            
            /*OneSignal.initWithLaunchOptions(launchOptions,
                                            appId: "676ca41f-2d72-44bc-9db5-43411cfc185b", //OneSignal APP ID
                handleNotificationAction: nil,
                settings: onesignalInitSettings)*/
            
            OneSignal.inFocusDisplayType = OSNotificationDisplayType.notification;
        }
        
        /*
        // Recommend moving the below line to prompt for push after informing the user about
        //   how your app will use them.
        OneSignal.promptForPushNotifications(userResponse: { accepted in
            print("User accepted notifications: \(accepted)")
        })
        */
        /*
        if registerlocalpush.isEqual("true")
        {
            if application.responds(to: #selector(getter: application.isRegisteredForRemoteNotifications))
            {
                if #available(iOS 10.0, *)
                {
                    UNUserNotificationCenter.current().requestAuthorization(options: [.sound, .alert, .badge]) {(accepted, error) in
                        if !accepted {
                            print("Notification access denied.")
                        }
                    }
                }
                else
                {
                    application.registerUserNotificationSettings(UIUserNotificationSettings(types: ([.sound, .alert, .badge]), categories: nil))
                    application.registerForRemoteNotifications()
                }
            }
            else
            {
                application.registerForRemoteNotifications(matching: ([.badge, .alert, .sound]))
            }
        }*/
        
        return true
    }
    
    func alertAction(title: String, message: String) {
        
        let alertController = UIAlertController(title: title, message: message, preferredStyle: .alert)
        alertController.addAction(UIAlertAction(title: "Ok", style: .default, handler: { (action) in
            // Do something with handler block
        }))
        
        let pushedViewControllers = self.window?.rootViewController
        //let presentedViewController = pushedViewControllers[pushedViewControllers.count - 1]
        
        pushedViewControllers?.present(alertController, animated: true, completion: nil)
    }
    
    func application(_ application: UIApplication, didReceiveRemoteNotification userInfo: [AnyHashable : Any], fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
        print(userInfo)
    }
    
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent: UNNotification, withCompletionHandler: @escaping (UNNotificationPresentationOptions)->()) {
        print("willPresent method called")
        print(willPresent.request.content.userInfo)
        
        let defaults = UserDefaults.standard
        
        let userInfo = willPresent.request.content.userInfo
        if let aps = userInfo["custom"] as? NSDictionary {
            if let id = aps["i"] as? String {
                defaults.set(true, forKey: id)
            }
        }
        
        let notification = [
            "title" : willPresent.request.content.title,
            "subtitle" : willPresent.request.content.subtitle,
            "body" : willPresent.request.content.body
            ] as [String : Any]
        
        if var notificationArray = defaults.array(forKey: "notifications") {
            notificationArray.append(notification)
            defaults.set(notificationArray, forKey: "notifications")
        } else {
            let notificationArray = [notification]
            defaults.set(notificationArray, forKey: "notifications")
        }
        NotificationCenter.default.post(name: NSNotification.Name.init("update_notification"), object: nil, userInfo: nil)
        
        withCompletionHandler([.alert, .sound, .badge])
    }
    
    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive: UNNotificationResponse, withCompletionHandler: @escaping ()->()) {
        print("didReceive Method called")
        print(didReceive.notification.request.content.userInfo)
        
        let defaults = UserDefaults.standard
        
        let userInfo = didReceive.notification.request.content.userInfo
        if let aps = userInfo["custom"] as? NSDictionary {
            if let id = aps["i"] as? String {
                if defaults.bool(forKey: id) {
                    withCompletionHandler()
                    return
                }
            }
        }
        
        let notification = [
            "title" : didReceive.notification.request.content.title,
            "subtitle" : didReceive.notification.request.content.subtitle,
            "body" : didReceive.notification.request.content.body
            ] as [String : Any]
        
        if var notificationArray = defaults.array(forKey: "notifications") {
            notificationArray.append(notification)
            defaults.set(notificationArray, forKey: "notifications")
        } else {
            let notificationArray = [notification]
            defaults.set(notificationArray, forKey: "notifications")
        }
        NotificationCenter.default.post(name: NSNotification.Name.init("update_notification"), object: nil, userInfo: nil)
        //DispatchQueue.main.async(execute: {
        //    self.alertAction(title: "didReceive", message: didReceive.notification.request.content.body)
        //})
        withCompletionHandler()
    }
    
    
    
    func applicationWillResignActive(_ application: UIApplication) {
    }
    
    func applicationDidEnterBackground(_ application: UIApplication) {
    }
    
    func applicationWillEnterForeground(_ application: UIApplication) {
    }
    
    func applicationDidBecomeActive(_ application: UIApplication) {
    }
    
    func applicationWillTerminate(_ application: UIApplication) {
    }
    
    
}
