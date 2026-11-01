//
//  CharacterEditorSheetView.swift
//  Rubliks
//

import SwiftUI

/// Редактирование внешности персонажа из профиля (модальное окно).
struct CharacterEditorSheetView: View {
    @Environment(\.dismiss) private var dismiss
    @Binding var appearance: CharacterAppearance
    var onSave: (() -> Void)?

    var body: some View {
        NavigationStack {
            ZStack(alignment: .topLeading) {
                AppTheme.backgroundLightGray.ignoresSafeArea()

                VStack(spacing: 0) {
                    CharacterAvatarView(appearance: appearance, size: 120)
                        .padding(.vertical, 24)

                    ScrollView(.vertical, showsIndicators: false) {
                        VStack(alignment: .leading, spacing: 12) {
                            optionsList
                            nameField
                        }
                        .padding(.horizontal, 24)
                        .padding(.bottom, 24)
                    }
                }
            }
            .navigationTitle("Внешность")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Отмена") { dismiss() }
                        .foregroundColor(AppTheme.cardPurpleDark)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Готово") {
                        appearance.save()
                        onSave?()
                        dismiss()
                    }
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundColor(AppTheme.accentRed)
                }
            }
        }
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
}
