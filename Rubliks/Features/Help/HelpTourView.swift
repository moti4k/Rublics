//
//  HelpTourView.swift
//  Rubliks
//

import SwiftUI

/// Пошаговый обзор приложения: что делает каждый раздел.
struct HelpTourView: View {
    var onDismiss: (() -> Void)?
    @State private var step: Int = 0

    private let steps: [(icon: String, title: String, text: String)] = [
        ("house.fill", "Главная", "Здесь новости, баланс и список акций. Раздел «Обучение» — темы про крипту, фьючерсы, акции и налоги: можно почитать и купить актив. Внизу — где лежат твои деньги и кнопка «Продать»."),
        ("gamecontroller.fill", "Игра", "Квиз по инвестициям, «Покупай низко — продавай высоко», сценарии «Финансовый выбор» и «Вперёд, инвестор!» — игры, чтобы учиться и зарабатывать очки."),
        ("graduationcap.fill", "Обучение", "Отдельные материалы и уроки по темам. Дополняет карточки обучения на главной."),
        ("person.fill", "Профиль", "Твой аватар и имя, подписка (Бесплатный, Базовый, Про) и достижения. Нажми на карточку профиля, чтобы изменить внешность персонажа.")
    ]

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                if step > 0 {
                    Button("Назад") {
                        withAnimation(.easeInOut(duration: 0.2)) { step -= 1 }
                    }
                    .foregroundColor(AppTheme.cardPurpleDark)
                    .padding(.leading, 16)
                }
                Spacer()
                Button("Пропустить") {
                    onDismiss?()
                }
                .font(.system(size: 15, weight: .medium))
                .foregroundColor(Color(white: 0.5))
                .padding(.trailing, 16)
            }
            .padding(.vertical, 12)
            .background(Color(white: 0.98))

            TabView(selection: $step) {
                ForEach(Array(steps.enumerated()), id: \.offset) { i, s in
                    stepContent(icon: s.icon, title: s.title, text: s.text)
                        .tag(i)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))

            pageIndicator
            bottomButton
        }
        .background(AppTheme.backgroundLightGray)
    }

    private var bottomButton: some View {
        Button {
            if step < steps.count - 1 {
                withAnimation(.easeInOut(duration: 0.25)) { step += 1 }
            } else {
                onDismiss?()
            }
        } label: {
            Text(step < steps.count - 1 ? "Далее" : "Готово")
                .font(.system(size: 17, weight: .bold))
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(AppTheme.accentRed)
                .cornerRadius(AppTheme.buttonCornerRadius)
        }
        .padding(.horizontal, 24)
        .padding(.bottom, 32)
    }

    private func stepContent(icon: String, title: String, text: String) -> some View {
        ScrollView {
            VStack(spacing: 28) {
                ZStack {
                    Circle()
                        .fill(AppTheme.cardPurpleLight.opacity(0.25))
                        .frame(width: 100, height: 100)
                    Image(systemName: icon)
                        .font(.system(size: 44, weight: .medium))
                        .foregroundColor(AppTheme.cardPurpleDark)
                }
                .padding(.top, 40)
                Text(title)
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(Color(white: 0.15))
                Text(text)
                    .font(.system(size: 16, weight: .regular))
                    .foregroundColor(Color(white: 0.4))
                    .multilineTextAlignment(.center)
                    .lineSpacing(4)
                    .padding(.horizontal, 28)
            }
        }
    }

    private var pageIndicator: some View {
        HStack(spacing: 8) {
            ForEach(0..<steps.count, id: \.self) { i in
                Circle()
                    .fill(i == step ? AppTheme.accentRed : Color(white: 0.75))
                    .frame(width: 8, height: 8)
            }
        }
        .padding(.bottom, 28)
    }
}
