//
//  QuizItem.swift
//  Rubliks
//

import Foundation

struct QuizItem: Identifiable {
    let id: String
    let question: String
    let options: [String]
    /// Пояснение после ответа (образовательный текст)
    let explanation: String
    /// Индекс правильного ответа (0, 1, 2…). Если nil — показываем только explanation без «Правильный ответ».
    let correctAnswerIndex: Int?

    init(id: String, question: String, options: [String], explanation: String, correctAnswerIndex: Int? = nil) {
        self.id = id
        self.question = question
        self.options = options
        self.explanation = explanation
        self.correctAnswerIndex = correctAnswerIndex
    }
}

struct QuizState {
    var currentIndex: Int
    var selectedOptionIndex: Int?
    let items: [QuizItem]
}
