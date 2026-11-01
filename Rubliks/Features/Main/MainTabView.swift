//
//  MainTabView.swift
//  Rubliks
//

import SwiftUI
import UIKit

private let helpTourSeenKey = "hasSeenHelpTour"

struct MainTabView: View {
    @State private var selectedTab = 0
    @State private var showHelp = false

    var body: some View {
        ZStack(alignment: .topTrailing) {
        TabView(selection: $selectedTab) {
            NavigationStack {
                HomeView()
                    .navigationDestination(for: TopicRoute.self) { route in
                        switch route {
                        case .chart(let secid):
                            ChartView(secid: secid)
                        case .topic(let id):
                            TopicDetailView(topicId: id)
                        case .stocks:
                            StocksListView()
                        }
                    }
            }
            .tabItem {
                Image(systemName: "house.fill")
                Text("Главная")
            }
            .tag(0)
            
            NavigationStack {
                GameTabView()
            }
            .tabItem {
                Image(systemName: "gamecontroller.fill")
                Text("Игра")
            }
            .tag(1)
            
            NavigationStack {
                EducationView()
            }
            .tabItem {
                Image(systemName: "graduationcap.fill")
                Text("Обучение")
            }
            .tag(2)
            
            NavigationStack {
                FriendsView()
            }
            .tabItem {
                Image(systemName: "person.2.fill")
                Text("Друзья")
            }
            .tag(3)
            
            NavigationStack {
                ProfileView()
            }
            .tabItem {
                Image(systemName: "person.fill")
                Text("Профиль")
            }
            .tag(4)
        }
        .tint(AppTheme.accentRed)
        .onAppear {
            let appearance = UITabBarAppearance()
            appearance.configureWithOpaqueBackground()
            appearance.backgroundColor = UIColor(red: 0.97, green: 0.97, blue: 0.98, alpha: 1)
            UITabBar.appearance().standardAppearance = appearance
            UITabBar.appearance().scrollEdgeAppearance = appearance
            if !UserDefaults.standard.bool(forKey: helpTourSeenKey) {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { showHelp = true }
            }
        }

            if selectedTab != 1 {
                Button {
                    showHelp = true
                } label: {
                    Image(systemName: "questionmark.circle.fill")
                        .font(.system(size: 28))
                        .foregroundStyle(AppTheme.cardPurpleLight)
                        .shadow(color: .black.opacity(0.12), radius: 2, x: 0, y: 1)
                }
                .padding(.top, 56)
                .padding(.trailing, 16)
            }
        }
        .fullScreenCover(isPresented: $showHelp) {
            HelpTourView {
                showHelp = false
                UserDefaults.standard.set(true, forKey: helpTourSeenKey)
            }
        }
    }
}
