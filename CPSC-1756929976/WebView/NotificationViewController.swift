//
//  Copyright (c) 2017 Google Inc.
//
//  Licensed under the Apache License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License.
//  You may obtain a copy of the License at
//
//  http://www.apache.org/licenses/LICENSE-2.0
//
//  Unless required by applicable law or agreed to in writing, software
//  distributed under the License is distributed on an "AS IS" BASIS,
//  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  See the License for the specific language governing permissions and
//  limitations under the License.
//

class NotificationViewController: UIViewController {
    
    @IBOutlet var notificationTableView: UITableView!
    
    let emptyLabel: UILabel = {
        let messageLabel = UILabel()
        messageLabel.text = "No Notification."
        messageLabel.textColor = UIColor.black
        messageLabel.numberOfLines = 0
        messageLabel.textAlignment = .center
        messageLabel.font = UIFont.preferredFont(forTextStyle: .title3)
        messageLabel.sizeToFit()
        return messageLabel
    }()
    
    var notificationArray : [Dictionary<String, String>] = []
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        updateNotification()
        
        NotificationCenter.default.addObserver(self, selector: #selector(updateNotification), name: NSNotification.Name.init("update_notification"), object: nil)
    }
    
    @IBAction func back() {
        self.dismiss(animated: true, completion: nil)
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        UIApplication.shared.statusBarStyle = .lightContent
    }
    
    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        UIApplication.shared.statusBarStyle = .default
    }
    
    @objc func updateNotification() {
        let defaults = UserDefaults.standard
        if let array = defaults.array(forKey: "notifications") {
            notificationArray = array as! [Dictionary<String, String>]
            notificationArray.reverse()
        }
        notificationTableView.reloadData()
    }
}

extension NotificationViewController: UITableViewDelegate, UITableViewDataSource {
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        tableView.separatorColor = notificationArray.isEmpty ? .clear : .gray
        tableView.backgroundView = notificationArray.isEmpty ? emptyLabel : nil
        return notificationArray.count
    }
    
    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "NotificationCell")
        let titleLabel = cell?.viewWithTag(1) as! UILabel
        titleLabel.text = notificationArray[indexPath.row]["title"]
        let subtitleLabel = cell?.viewWithTag(2) as! UILabel
        subtitleLabel.text = notificationArray[indexPath.row]["subtitle"]
        let bodyLabel = cell?.viewWithTag(3) as! UILabel
        bodyLabel.text = notificationArray[indexPath.row]["body"]
        //let timeLabel = cell?.viewWithTag(4) as! UILabel
        //timeLabel.text = patients[indexPath.row].birthday
        return cell!
    }
    
    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
    }
}
