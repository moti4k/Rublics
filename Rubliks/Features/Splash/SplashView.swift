//
//  SplashView.swift
//  Rubliks
//

import SwiftUI

struct SplashView: View {
    @ObservedObject var appState: AppState

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [AppTheme.splashGradientStart, AppTheme.splashGradientEnd],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            VStack(spacing: 12) {
                Text("РУБЛИКС")
                    .font(.system(size: 36, weight: .bold))
                    .foregroundColor(.white)
                Text("ВЫБИРАЙ ОПЫТ С НАМИ")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(.white.opacity(0.95))
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .onAppear {
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                appState.finishSplash()
            }
        }
    }
}
