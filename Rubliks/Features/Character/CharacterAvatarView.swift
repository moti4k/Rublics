//
//  CharacterAvatarView.swift
//  Rubliks
//

import SwiftUI

/// Визуальное отображение выбранного персонажа — узнаваемый силуэт с разными вариантами.
struct CharacterAvatarView: View {
    let appearance: CharacterAppearance
    var size: CGFloat = 120

    var body: some View {
        ZStack {
            Circle()
                .fill(AppTheme.cardPurpleLight.opacity(0.15))
                .frame(width: size, height: size)

            bodyGroup
        }
        .frame(width: size, height: size)
    }

    private var bodyGroup: some View {
        ZStack(alignment: .bottom) {
            legsAndShoes
            torso
            neck
            headWithHair
            accessoryOverlay
        }
    }

    private var skinColor: Color {
        switch appearance.skinToneIndex {
        case 0: return Color(red: 1.0, green: 0.91, blue: 0.82)
        case 1: return Color(red: 0.95, green: 0.78, blue: 0.62)
        default: return Color(red: 0.76, green: 0.6, blue: 0.48)
        }
    }

    private var headWithHair: some View {
        ZStack(alignment: .top) {
            faceShape
                .frame(width: headWidth, height: headHeight)
                .offset(y: size * 0.22)
            hairShape
                .frame(width: hairWidth, height: hairHeight)
                .offset(y: size * 0.12)
        }
    }

    private var headWidth: CGFloat { size * 0.38 }
    private var headHeight: CGFloat { size * 0.36 }
    private var hairWidth: CGFloat { size * 0.42 }
    private var hairHeight: CGFloat { size * 0.2 }

    @ViewBuilder
    private var faceShape: some View {
        let f = skinColor
        switch appearance.faceIndex % 5 {
        case 0: Circle().fill(f)
        case 1: Ellipse().fill(f).scaleEffect(x: 0.9, y: 1.1)
        case 2: RoundedRectangle(cornerRadius: headWidth * 0.25).fill(f)
        case 3: Ellipse().fill(f).scaleEffect(x: 1.05, y: 0.95)
        default: RoundedRectangle(cornerRadius: headWidth * 0.35).fill(f)
        }
    }

    @ViewBuilder
    private var hairShape: some View {
        switch appearance.hairIndex % 6 {
        case 0:
            RoundedRectangle(cornerRadius: 4).fill(hairColor)
                .frame(width: hairWidth, height: hairHeight * 0.7)
        case 1:
            VStack(spacing: -2) {
                ForEach(0..<5, id: \.self) { _ in
                    RoundedRectangle(cornerRadius: 2).fill(hairColor)
                        .frame(width: hairWidth * 0.5, height: 4)
                }
            }
        case 2:
            RoundedRectangle(cornerRadius: 6).fill(hairColor)
                .frame(width: hairWidth * 1.1, height: hairHeight)
        case 3:
            Ellipse().fill(hairColor)
                .frame(width: hairWidth * 0.9, height: hairHeight * 1.4)
        case 4:
            Capsule().fill(hairColor)
                .frame(width: hairWidth * 0.4, height: hairHeight * 1.6)
                .offset(y: hairHeight * 0.3)
        default:
            ZStack {
                Ellipse().fill(hairColor).frame(width: hairWidth, height: hairHeight)
                ForEach(0..<4, id: \.self) { i in
                    Circle().fill(hairColor)
                        .frame(width: 8, height: 8)
                        .offset(x: CGFloat(i - 2) * 6, y: -4)
                }
            }
        }
    }

    private var hairColor: Color {
        switch appearance.hairIndex % 6 {
        case 0: return Color(red: 0.35, green: 0.22, blue: 0.12)
        case 1: return Color(red: 0.25, green: 0.15, blue: 0.08)
        case 2: return Color(red: 0.55, green: 0.35, blue: 0.2)
        case 3: return Color(red: 0.5, green: 0.3, blue: 0.15)
        case 4: return Color(red: 0.4, green: 0.25, blue: 0.15)
        default: return Color(red: 0.6, green: 0.4, blue: 0.25)
        }
    }

    private var neck: some View {
        RoundedRectangle(cornerRadius: 2)
            .fill(skinColor)
            .frame(width: size * 0.12, height: size * 0.08)
            .offset(y: size * 0.38)
    }

    private var torso: some View {
        VStack(spacing: 0) {
            RoundedRectangle(cornerRadius: 6)
                .fill(topColor)
                .frame(width: size * 0.5, height: size * 0.28)
            if appearance.topIndex % 5 == 1 || appearance.topIndex % 5 == 2 {
                Rectangle().fill(topColor).frame(width: size * 0.48, height: 2)
            }
        }
        .overlay(
            RoundedRectangle(cornerRadius: 6)
                .stroke(Color(white: 0.85), lineWidth: 0.5)
        )
        .offset(y: size * 0.46)
    }

    private var topColor: Color {
        switch appearance.topIndex % 5 {
        case 0: return Color(red: 0.35, green: 0.55, blue: 0.95)
        case 1: return Color(red: 0.98, green: 0.98, blue: 0.98)
        case 2: return AppTheme.cardPurpleDark.opacity(0.9)
        case 3: return Color(red: 0.4, green: 0.35, blue: 0.5)
        default: return Color(red: 0.2, green: 0.5, blue: 0.35)
        }
    }

    private var legsAndShoes: some View {
        VStack(spacing: 2) {
            HStack(spacing: size * 0.08) {
                RoundedRectangle(cornerRadius: 3).fill(bottomColor)
                    .frame(width: size * 0.18, height: size * 0.22)
                RoundedRectangle(cornerRadius: 3).fill(bottomColor)
                    .frame(width: size * 0.18, height: size * 0.22)
            }
            HStack(spacing: size * 0.12) {
                RoundedRectangle(cornerRadius: 2).fill(shoesColor)
                    .frame(width: size * 0.2, height: size * 0.08)
                RoundedRectangle(cornerRadius: 2).fill(shoesColor)
                    .frame(width: size * 0.2, height: size * 0.08)
            }
        }
        .offset(y: size * 0.72)
    }

    private var bottomColor: Color {
        switch appearance.bottomIndex % 5 {
        case 0: return Color(red: 0.22, green: 0.32, blue: 0.55)
        case 1: return Color(white: 0.2)
        case 2: return Color(red: 0.45, green: 0.5, blue: 0.6)
        case 3: return Color(red: 0.5, green: 0.35, blue: 0.5)
        default: return Color(red: 0.35, green: 0.4, blue: 0.45)
        }
    }

    private var shoesColor: Color {
        switch appearance.shoesIndex % 5 {
        case 0: return Color(white: 0.4)
        case 1: return Color(red: 0.28, green: 0.2, blue: 0.16)
        case 2: return Color(red: 0.15, green: 0.15, blue: 0.15)
        case 3: return Color(red: 0.25, green: 0.2, blue: 0.18)
        default: return Color(red: 0.6, green: 0.45, blue: 0.3)
        }
    }

    @ViewBuilder
    private var accessoryOverlay: some View {
        if appearance.accessoryIndex % 4 == 0 {
            Circle().stroke(AppTheme.cardPurpleDark, lineWidth: 2)
                .frame(width: size * 0.2, height: size * 0.2)
                .offset(x: size * 0.32, y: size * 0.28)
        } else if appearance.accessoryIndex % 4 == 1 {
            RoundedRectangle(cornerRadius: 4).stroke(AppTheme.cardPurpleDark, lineWidth: 2)
                .frame(width: size * 0.35, height: size * 0.12)
                .offset(y: size * 0.2)
        } else if appearance.accessoryIndex % 4 == 2 {
            Circle().fill(Color(white: 0.3))
                .frame(width: size * 0.15, height: size * 0.15)
                .offset(x: -size * 0.3, y: size * 0.18)
            Circle().fill(Color(white: 0.3))
                .frame(width: size * 0.15, height: size * 0.15)
                .offset(x: size * 0.3, y: size * 0.18)
        }
    }
}
