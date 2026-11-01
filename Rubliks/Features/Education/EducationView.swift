//
//  EducationView.swift
//  Rubliks
//

import SwiftUI

struct LessonCard: Identifiable {
    let id: String
    let title: String
    let shortText: String
    let duration: String
}

struct EducationView: View {
    private let lessons: [LessonCard] = [
        LessonCard(id: "1", title: "Что такое акция и зачем её покупать", shortText: "Акция — доля в компании. Доход: рост цены и дивиденды.", duration: "5 мин"),
        LessonCard(id: "2", title: "Диверсификация портфеля", shortText: "Распределение денег по разным активам снижает риск.", duration: "7 мин"),
        LessonCard(id: "3", title: "Как читать отчётность компании", shortText: "Выручка, прибыль, долг — ключевые показатели.", duration: "10 мин"),
        LessonCard(id: "4", title: "ИИС: вычет и освобождение от налога", shortText: "Типы ИИС и как получить льготу по НДФЛ.", duration: "6 мин"),
        LessonCard(id: "5", title: "Облигации: доходность и риски", shortText: "Купон, номинал, дюрация и что влияет на цену.", duration: "8 мин")
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Учебные материалы")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundColor(Color(white: 0.15))
                    .padding(.horizontal, 20)
                ForEach(lessons) { lesson in
                    LessonRowView(lesson: lesson)
                }
                .padding(.horizontal, 20)

                Button(action: orderExpertLessons) {
                    HStack(spacing: 12) {
                        Image(systemName: "person.crop.circle.badge.checkmark")
                            .font(.system(size: 24))
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Заказать уроки у эксперта")
                                .font(.system(size: 17, weight: .semibold))
                                .foregroundColor(Color(white: 0.15))
                            Text("Персональные консультации и разбор тем")
                                .font(.system(size: 13))
                                .foregroundColor(Color(white: 0.5))
                        }
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(AppTheme.cardPurpleLight)
                    }
                    .padding(16)
                    .background(Color.white)
                    .cornerRadius(AppTheme.cornerRadius)
                    .overlay(
                        RoundedRectangle(cornerRadius: AppTheme.cornerRadius)
                            .stroke(AppTheme.cardPurpleLight.opacity(0.4), lineWidth: 1)
                    )
                }
                .buttonStyle(.plain)
                .padding(.horizontal, 20)
                .padding(.top, 8)
            }
            .padding(.vertical, 20)
        }
        .background(AppTheme.backgroundLightGray)
        .navigationTitle("Обучение")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func orderExpertLessons() {
        // Действие: открыть экран заказа или ссылку на эксперта
    }
}

struct LessonRowView: View {
    let lesson: LessonCard

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(lesson.title)
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundColor(Color(white: 0.15))
                Spacer()
                Text(lesson.duration)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(AppTheme.cardPurpleLight)
            }
            Text(lesson.shortText)
                .font(.system(size: 14, weight: .regular))
                .foregroundColor(Color(white: 0.45))
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(AppTheme.cornerRadius)
    }
}
