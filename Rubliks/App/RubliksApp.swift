//
//  RubliksApp.swift
//  Rubliks
//

import SwiftUI

@main
struct RubliksApp: App {
    var body: some Scene {
        WindowGroup {
            RootView()
                .preferredColorScheme(.light)
                .background(Color(red: 0.96, green: 0.96, blue: 0.97))
        }
    }
}
