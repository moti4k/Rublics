//
//  RootView.swift
//  Rubliks
//

import SwiftUI

struct RootView: View {
    @StateObject private var appState = AppState()

    var body: some View {
        ZStack {
            Color(red: 0.96, green: 0.96, blue: 0.97)
                .ignoresSafeArea()

            switch appState.flow {
            case .splash:
                SplashView(appState: appState)
            case .onboarding:
                OnboardingView(appState: appState)
            case .auth:
                AuthView(appState: appState)
            case .character:
                CharacterCreationView(appState: appState)
            case .main:
                MainTabView()
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .animation(.easeInOut(duration: 0.3), value: appState.flow)
    }
}
