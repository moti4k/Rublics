//
//  CharacterCreationView.swift
//  Rubliks
//

import SwiftUI

struct CharacterCreationView: View {
    @ObservedObject var appState: AppState
    @State private var appearance: CharacterAppearance

    init(appState: AppState) {
        self.appState = appState
        _appearance = State(initialValue: CharacterAppearance.load())
    }

    var body: some View {
        ZStack(alignment: .topLeading) {
            AppTheme.backgroundLightGray.ignoresSafeArea()

            VStack(spacing: 0) {
                headerView
                CharacterAvatarView(appearance: appearance, size: 130)
                    .padding(.vertical, 16)

                ScrollView(.vertical, showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 12) {
                        optionsList
                        nameField
                    }
                    .padding(.horizontal, 24)
                    .padding(.bottom, 24)
                }

                navigationButtons
            }
        }
    }

    private var headerView: some View {
        ZStack(alignment: .leading) {
            AppTheme.cardPurpleDark
                .frame(height: 120)
                .clipShape(
                    .rect(
                        topLeadingRadius: 0,
                        bottomLeadingRadius: 40,
                        bottomTrailingRadius: 0,
                        topTrailingRadius: 0
                    )
                )
            Text("СОЗДАЙ СВОЕГО ПЕРСОНАЖА!")
                .font(.system(size: 22, weight: .bold))
                .foregroundColor(.white)
                .padding(.leading, 24)
                .padding(.top, 60)
        }
        .frame(height: 120)
    }

    private var optionsList: some View {
        VStack(alignment: .leading, spacing: 12) {
            CharacterOptionRow(title: "ТОН КОЖИ", value: CharacterAppearance.skinToneOptions[appearance.skinToneIndex], count: CharacterAppearance.skinToneOptions.count, index: $appearance.skinToneIndex)
            CharacterOptionRow(title: "ЛИЦО", value: CharacterAppearance.faceOptions[appearance.faceIndex], count: CharacterAppearance.faceOptions.count, index: $appearance.faceIndex)
            CharacterOptionRow(title: "ПРИЧЕСКА", value: CharacterAppearance.hairOptions[appearance.hairIndex], count: CharacterAppearance.hairOptions.count, index: $appearance.hairIndex)
            CharacterOptionRow(title: "ВЕРХНЯЯ ОДЕЖДА", value: CharacterAppearance.topOptions[appearance.topIndex], count: CharacterAppearance.topOptions.count, index: $appearance.topIndex)
            CharacterOptionRow(title: "НИЖНЯЯ ОДЕЖДА", value: CharacterAppearance.bottomOptions[appearance.bottomIndex], count: CharacterAppearance.bottomOptions.count, index: $appearance.bottomIndex)
            CharacterOptionRow(title: "ОБУВЬ", value: CharacterAppearance.shoesOptions[appearance.shoesIndex], count: CharacterAppearance.shoesOptions.count, index: $appearance.shoesIndex)
            CharacterOptionRow(title: "АКСЕССУАРЫ", value: CharacterAppearance.accessoryOptions[appearance.accessoryIndex], count: CharacterAppearance.accessoryOptions.count, index: $appearance.accessoryIndex)
        }
    }

    private var nameField: some View {
        TextField("Меня зовут", text: $appearance.name)
            .font(.system(size: 16, weight: .medium))
            .foregroundColor(AppTheme.cardPurpleDark)
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
            .background(Color.white)
            .cornerRadius(AppTheme.cornerRadiusSmall)
            .overlay(
                RoundedRectangle(cornerRadius: AppTheme.cornerRadiusSmall)
                    .stroke(AppTheme.cardPurpleLight.opacity(0.6), lineWidth: 1)
            )
            .padding(.top, 20)
    }

    private var navigationButtons: some View {
        HStack {
            Button(action: { appState.flow = .auth }) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 20, weight: .medium))
                    .foregroundColor(AppTheme.cardPurpleDark)
                    .frame(width: 44, height: 44)
            }
            .buttonStyle(.plain)
            Spacer()
            Button(action: {
                appearance.save()
                appState.finishCharacter()
            }) {
                Image(systemName: "chevron.right")
                    .font(.system(size: 20, weight: .medium))
                    .foregroundColor(AppTheme.cardPurpleDark)
                    .frame(width: 44, height: 44)
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 16)
        .background(AppTheme.backgroundLightGray)
    }
}

struct CharacterOptionRow: View {
    let title: String
    let value: String
    let count: Int
    @Binding var index: Int

    var body: some View {
        Button {
            index = (index + 1) % count
        } label: {
            HStack {
                Text(title)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(AppTheme.cardPurpleDark)
                Spacer()
                Image(systemName: "chevron.right.circle.fill")
                    .font(.system(size: 22))
                    .foregroundColor(AppTheme.cardPurpleLight)
                Text(value)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(Color(white: 0.35))
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity)
            .frame(minHeight: 48)
            .padding(.vertical, 14)
            .padding(.horizontal, 16)
            .background(Color.white)
            .cornerRadius(AppTheme.cornerRadiusSmall)
            .contentShape(Rectangle())
        }
        .buttonStyle(CharacterOptionButtonStyle())
    }
}

/// Стиль кнопки, чтобы нажатие гарантированно срабатывало и не перехватывалось жестами.
struct CharacterOptionButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .opacity(configuration.isPressed ? 0.85 : 1)
    }
}
