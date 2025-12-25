//
//  OnlineAppCreator.com
//  WebViewGold for iOS 4.4 (Swift)
//

import Foundation
import UIKit

public struct Constants {
    
    static let kAppDelegate         = UIApplication.shared.delegate as! AppDelegate
    static let kUserDefaults        = UserDefaults.standard
    static let kScreenWidth         = UIScreen.main.bounds.width
    static let kScreenHeight        = UIScreen.main.bounds.height
    static let kAppDisplayName      = UIApplication.appName
    static let kAppVersion          = UIApplication.shortVersionString
    static let kCountryCode         = UIApplication.countryCode
    static let kCalendar            = Calendar.current
    static let kDeviceType          = "ios"
    static let kSystemVersion       = UIDevice.current.systemVersion
    static let kModel               = UIDevice.current.model
    static let kDeviceId            = UIDevice.current.identifierForVendor!.uuidString
    
    // OneSignal Options
    static let kPushEnabled         = true; //set to true to activate OneSignal Push (set App ID in AppDelegate.swift)
    static let kPushEnhanceUrl      = true; //set to true if you want to extend URL request by ?onesignal_push_id=XYZ
    static let kPushReloadOnUserId  = true; //set to true if WebView should be reloaded when the app gets a UserID from OneSignal

}

public struct AlertMessage{
    static let dataMissing = "Something went wrong. Please try again."
}


