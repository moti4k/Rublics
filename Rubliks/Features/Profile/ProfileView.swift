//
//  ProfileView.swift
//  Rubliks
//

import SwiftUI

struct ProfileView: View {
    @State private var appearance = CharacterAppearance.load()
    @State private var userProfile: UserProfile?
    @State private var showSubscriptionPicker = false
    @State private var showCharacterEditor = false
    private let service = MoexMockService.shared

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                profileCard
                subscriptionCard
                achievementsSection
            }
            .padding(20)
        }
        .background(AppTheme.backgroundLightGray)
        .navigationTitle("Профиль")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showSubscriptionPicker) {
            SubscriptionPickerView()
        }
        .sheet(isPresented: $showCharacterEditor) {
            CharacterEditorSheetView(appearance: $appearance) {
                appearance = CharacterAppearance.load()
            }
        }
        .onAppear {
            appearance = CharacterAppearance.load()
            userProfile = UserProfile.loadCurrent()
        }
    }

    private var profileCard: some View {
        Button {
            showCharacterEditor = true
        } label: {
            HStack(spacing: 20) {
                CharacterAvatarView(appearance: appearance, size: 80)
                VStack(alignment: .leading, spacing: 6) {
                    Text(profileDisplayName)
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(Color(white: 0.15))
                    Text(profileSubtitle)
                        .font(.system(size: 14))
                        .foregroundColor(Color(white: 0.45))
                    Text("Нажмите, чтобы изменить внешность")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(AppTheme.accentRed)
                        .padding(.top, 4)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(Color(white: 0.5))
            }
            .padding(20)
            .background(Color.white)
            .cornerRadius(AppTheme.cornerRadius)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private var profileDisplayName: String {
        if let name = userProfile?.displayName, !name.isEmpty { return name }
        if !appearance.name.isEmpty { return appearance.name }
        return "Инвестор"
    }

    private var profileSubtitle: String {
        if let email = userProfile?.email, !email.isEmpty { return email }
        return "Рубликс"
    }

    private var subscriptionCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Подписка")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(Color(white: 0.15))
                Spacer()
                Button("Изменить") {
                    showSubscriptionPicker = true
                }
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(AppTheme.accentRed)
            }
            let plans = service.getSubscriptionPlans()
            let currentId = service.getCurrentSubscriptionId()
            if let plan = plans.first(where: { $0.id == currentId }) {
                HStack(spacing: 12) {
                    RoundedRectangle(cornerRadius: 6)
                        .fill(plan.color)
                        .frame(width: 4, height: 44)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(plan.name)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(Color(white: 0.2))
                        if let sub = plan.priceSubtitle, !sub.isEmpty {
                            Text(sub)
                                .font(.system(size: 12))
                                .foregroundColor(Color(white: 0.5))
                        }
                        Text("\(plan.price) / \(plan.period)")
                            .font(.system(size: 13))
                            .foregroundColor(Color(white: 0.5))
                    }
                    Spacer()
                }
                .padding(14)
                .background(Color.white)
                .cornerRadius(AppTheme.cornerRadiusSmall)
            }
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(AppTheme.cornerRadius)
    }

    private var achievementsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Достижения")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(Color(white: 0.15))
            HStack(spacing: 12) {
                achievementBadge(icon: "book.fill", title: "Учёба", done: true)
                achievementBadge(icon: "chart.line.uptrend.xyaxis", title: "Квизы", done: true)
                achievementBadge(icon: "star.fill", title: "Эксперт", done: false)
            }
        }
    }

    private func achievementBadge(icon: String, title: String, done: Bool) -> some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 28))
                .foregroundColor(done ? AppTheme.accentRed : Color(white: 0.7))
            Text(title)
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(Color(white: 0.4))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .background(Color.white)
        .cornerRadius(AppTheme.cornerRadiusSmall)
    }
}

struct SubscriptionPickerView: View {
    @Environment(\.dismiss) private var dismiss
    private let service = MoexMockService.shared
    @State private var selectedId: String

    init() {
        _selectedId = State(initialValue: MoexMockService.shared.getCurrentSubscriptionId())
    }

    var body: some View {
        NavigationStack {
            List(service.getSubscriptionPlans()) { plan in
                Button {
                    selectedId = plan.id
                    service.setSubscription(id: plan.id)
                } label: {
                    HStack {
                        VStack(alignment: .leading, spacing: 6) {
                            if plan.isBestOffer {
                                Text("Самый выгодный")
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundColor(Color(red: 0.15, green: 0.6, blue: 0.3))
                            }
                            Text(plan.name)
                                .font(.system(size: 17, weight: .semibold))
                                .foregroundColor(Color(white: 0.15))
                            if let sub = plan.priceSubtitle, !sub.isEmpty {
                                Text(sub)
                                    .font(.system(size: 13))
                                    .foregroundColor(Color(white: 0.5))
                            }
                            Text("\(plan.price) · \(plan.period)")
                                .font(.system(size: 13))
                                .foregroundColor(Color(white: 0.5))
                            ForEach(plan.features, id: \.self) { f in
                                Text("• \(f)")
                                    .font(.system(size: 12))
                                    .foregroundColor(Color(white: 0.45))
                            }
                        }
                        Spacer()
                        if selectedId == plan.id {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(AppTheme.accentRed)
                        }
                    }
                    .padding(.vertical, 8)
                }
            }
            .listStyle(.insetGrouped)
            .navigationTitle("Выбор подписки")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Готово") { dismiss() }
                        .foregroundColor(AppTheme.accentRed)
                }
            }
        }
    }
}
