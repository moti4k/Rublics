//
//  AppState.swift
//  Rubliks
//

import SwiftUI

/// Root app flow state: splash → onboarding → auth → character → main
enum AppFlow: String {
    case splash
    case onboarding
    case auth
    case character
    case main
}

final class AppState: ObservableObject {
    @Published var flow: AppFlow = .splash
    
    @AppStorage("hasCompletedOnboarding") var hasCompletedOnboarding: Bool = false
    @AppStorage("isLoggedIn") var isLoggedIn: Bool = false
    @AppStorage("hasCreatedCharacter") var hasCreatedCharacter: Bool = false
    
    func finishSplash() {
        if hasCompletedOnboarding {
            if isLoggedIn {
                flow = hasCreatedCharacter ? .main : .character
            } else {
                flow = .auth
            }
        } else {
            flow = .onboarding
        }
    }
    
    func finishOnboarding() {
        hasCompletedOnboarding = true
        flow = .auth
    }
    
    func skipOnboarding() {
        hasCompletedOnboarding = true
        flow = .auth
    }
    
    func finishAuth() {
        isLoggedIn = true
        flow = .character
    }
    
    func finishCharacter() {
        hasCreatedCharacter = true
        flow = .main
    }
}
