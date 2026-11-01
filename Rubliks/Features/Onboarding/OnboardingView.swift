//
//  OnboardingView.swift
//  Rubliks
//

import SwiftUI

struct OnboardingView: View {
    @ObservedObject var appState: AppState
    @State private var currentPage = 0
    
    private let pages: [(title: String, imageName: String)] = [
        ("УЧИСЬ\nИНВЕСТИРОВАТЬ В\nИГРОВОМ ФОРМАТЕ\nБЫСТРО И ПРОСТО", "chart.line.uptrend.xyaxis"),
        ("РЕШАЙ КАРТОЧКИ С УЧЕБНЫМ МАТЕРИАЛОМ И СОРЕВНУЙСЯ С ДРУЗЬЯМИ", "person.3"),
        ("ТЫ МОЖЕШЬ БРАТЬ КОНСУЛЬТАЦИИ У ЭКСПЕРТОВ, ЧТОБЫ СТАТЬ ЛУЧШЕЙ ВЕРСИЕЙ СЕБЯ", "star")
    ]
    
    var body: some View {
        ZStack {
            Color.white.ignoresSafeArea()
            
            VStack(spacing: 0) {
                TabView(selection: $currentPage) {
                    ForEach(0..<pages.count, id: \.self) { index in
                        OnboardingPageView(
                            title: pages[index].title,
                            imageName: pages[index].imageName
                        )
                        .tag(index)
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
                
                // Custom pagination
                HStack(spacing: 8) {
                    ForEach(0..<pages.count, id: \.self) { index in
                        if index == currentPage {
                            RoundedRectangle(cornerRadius: 2)
                                .fill(AppTheme.accentRed)
                                .frame(width: 24, height: 8)
                        } else {
                            Circle()
                                .fill(AppTheme.paginationInactive)
                                .frame(width: 8, height: 8)
                        }
                    }
                }
                .padding(.vertical, 24)
                
                Button(action: {
                    if currentPage < pages.count - 1 {
                        withAnimation { currentPage += 1 }
                    } else {
                        appState.finishOnboarding()
                    }
                }) {
                    Text("ПРОДОЛЖИТЬ")
                        .font(.system(size: 17, weight: .bold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(AppTheme.accentRed)
                        .cornerRadius(AppTheme.buttonCornerRadius)
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 8)
                
                Button(action: { appState.skipOnboarding() }) {
                    Text("ПРОПУСТИТЬ")
                        .font(.system(size: 15, weight: .medium))
                        .foregroundColor(AppTheme.textSecondary)
                }
                .padding(.bottom, 32)
            }
        }
    }
}

struct OnboardingPageView: View {
    let title: String
    let imageName: String
    
    var body: some View {
        VStack(spacing: 32) {
            Image(systemName: imageName)
                .font(.system(size: 80))
                .foregroundStyle(
                    LinearGradient(
                        colors: [AppTheme.cardPurpleLight, AppTheme.accentRed],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .padding(.top, 60)
            
            Text(title)
                .font(.system(size: 22, weight: .bold))
                .multilineTextAlignment(.center)
                .foregroundColor(.primary)
                .padding(.horizontal, 24)
            
            Spacer()
        }
    }
}
